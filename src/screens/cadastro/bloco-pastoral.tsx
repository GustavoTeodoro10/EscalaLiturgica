import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { Chip } from '@/components/chip';
import { PlusIcon, XIcon } from '@/components/icones';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PastoralPublica } from '@/types';
import { mascaraData, nascimentoParaIso } from '@/utils/validacao';

export type FilhoDoBloco = {
  nome: string;
  /** como foi digitado: dd/mm/aaaa */
  nascimento: string;
  funcaoId: string;
};

/** O que a família escolheu para uma pastoral marcada no cadastro. */
export type Bloco = {
  eu: boolean;
  funcaoEu: string;
  filhos: FilhoDoBloco[];
  /** filho que está sendo digitado e ainda não foi adicionado */
  rascunho: FilhoDoBloco;
};

const RASCUNHO_VAZIO: FilhoDoBloco = { nome: '', nascimento: '', funcaoId: '' };

/**
 * Pastoral que pede responsável (ex.: coroinhas) começa sem ninguém marcado: a pessoa diz se serve ela, o filho, ou os dois.
 * As demais começam com "Eu", e o filho continua possível.
 */
export function blocoInicial(pastoral: PastoralPublica): Bloco {
  return { eu: !pastoral.exigeResponsavel, funcaoEu: '', filhos: [], rascunho: RASCUNHO_VAZIO };
}

type Props = {
  pastoral: PastoralPublica;
  bloco: Bloco;
  onChange: (proximo: Bloco) => void;
  erro?: string;
};

export function BlocoPastoral({ pastoral, bloco, onChange, erro }: Props) {
  const theme = useTheme();
  const [comFilho, setComFilho] = useState(bloco.filhos.length > 0 || bloco.rascunho.nome !== '');
  const [erroFilho, setErroFilho] = useState<string | null>(null);

  const rascunho = bloco.rascunho;

  function alternarFilho() {
    if (comFilho) onChange({ ...bloco, filhos: [], rascunho: RASCUNHO_VAZIO });
    setErroFilho(null);
    setComFilho(!comFilho);
  }

  function adicionarFilho() {
    const nome = rascunho.nome.trim();
    if (nome.length < 2) return setErroFilho('Digite o nome do filho(a).');
    const nasc = nascimentoParaIso(rascunho.nascimento);
    if ('erro' in nasc) return setErroFilho(nasc.erro);
    if (!rascunho.funcaoId) return setErroFilho('Escolha a função do filho(a).');
    setErroFilho(null);
    onChange({ ...bloco, filhos: [...bloco.filhos, { ...rascunho, nome }], rascunho: RASCUNHO_VAZIO });
  }

  const nomeDaFuncao = (id: string) => pastoral.funcoes.find((f) => f.id === id)?.nome ?? '';

  return (
    <Card>
      <ThemedText type="heading" accessibilityRole="header">
        {pastoral.nome}
      </ThemedText>

      <View style={styles.grupo}>
        <ThemedText type="smallBold">Quem vai servir aqui?</ThemedText>
        <View style={styles.chips}>
          <Chip
            papel="checkbox"
            rotulo="Eu"
            ativo={bloco.eu}
            onPress={() => onChange({ ...bloco, eu: !bloco.eu, funcaoEu: bloco.eu ? '' : bloco.funcaoEu })}
          />
          <Chip papel="checkbox" rotulo="Meu filho(a)" ativo={comFilho} onPress={alternarFilho} />
        </View>
      </View>

      {bloco.eu ? (
        <View style={styles.grupo}>
          <ThemedText type="smallBold">Sua função</ThemedText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {pastoral.funcoes.map((f) => (
              <Chip
                key={f.id}
                rotulo={f.nome}
                ativo={f.id === bloco.funcaoEu}
                onPress={() => onChange({ ...bloco, funcaoEu: f.id })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {comFilho ? (
        <View style={styles.grupo}>
          <Divisor />
          <ThemedText type="smallBold">Filho(a)</ThemedText>

          {bloco.filhos.map((f, i) => (
            <View key={`${f.nome}-${i}`} style={styles.filho}>
              <View style={styles.filhoTexto}>
                <ThemedText type="strong">{f.nome}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {nomeDaFuncao(f.funcaoId)} · nascido(a) em {f.nascimento}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => onChange({ ...bloco, filhos: bloco.filhos.filter((_, j) => j !== i) })}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${f.nome}`}
                style={styles.remover}>
                <XIcon size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}

          <TextField
            label="Nome do filho(a)"
            value={rascunho.nome}
            onChangeText={(t) => onChange({ ...bloco, rascunho: { ...rascunho, nome: t } })}
            placeholder="Nome"
            autoCapitalize="words"
          />
          <TextField
            label="Data de nascimento do filho(a)"
            value={rascunho.nascimento}
            onChangeText={(t) => onChange({ ...bloco, rascunho: { ...rascunho, nascimento: mascaraData(t) } })}
            placeholder="dd/mm/aaaa"
            keyboardType="number-pad"
            maxLength={10}
          />
          <View style={styles.grupo}>
            <ThemedText type="smallBold">Função do filho(a)</ThemedText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {pastoral.funcoes.map((f) => (
                <Chip
                  key={f.id}
                  rotulo={f.nome}
                  ativo={f.id === rascunho.funcaoId}
                  onPress={() => onChange({ ...bloco, rascunho: { ...rascunho, funcaoId: f.id } })}
                />
              ))}
            </View>
          </View>
          <Button title="Adicionar filho(a)" variant="secondary" icone={PlusIcon} onPress={adicionarFilho} />
          {erroFilho ? <Aviso tipo="erro">{erroFilho}</Aviso> : null}
        </View>
      ) : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  grupo: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  filhoTexto: {
    flex: 1,
  },
  remover: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
