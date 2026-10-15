import { useEffect, useState } from 'react';
import { StyleSheet, View, Linking } from 'react-native';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { EsqueletoLista } from '@/components/esqueleto';
import { WhatsappLogoIcon, XIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';
import type { Contato } from '@/types';
import { plural } from '@/utils/rotulos';

/** O que o coordenador pediu para chamar: uma função em uma missa. */
export type PedidoChamada = {
  eventoId: string;
  funcaoId: string;
  funcao: string;
  /** ex.: "Quinta-feira, 15 de outubro às 19:00" */
  quando: string;
};

type ChamarFamiliasProps = {
  pedido: PedidoChamada;
  onFechar: () => void;
};

/**
 * Membros livres (sem nenhuma missa futura) da função pedida, com o link do WhatsApp do responsável pronto.
 * Use `key` com a missa e a função para recarregar ao trocar de pedido.
 */
export function ChamarFamilias({ pedido, onFechar }: ChamarFamiliasProps) {
  const { eventoId, funcaoId, funcao, quando } = pedido;
  const { contatos } = usePainel();
  const [resultado, setResultado] = useState<{ lista: Contato[]; erro: string | null } | null>(null);

  useEffect(() => {
    let ativo = true;
    contatos(eventoId, funcaoId).then((r) => {
      if (ativo) setResultado(r);
    });
    return () => {
      ativo = false;
    };
  }, [contatos, eventoId, funcaoId]);

  return (
    <Card style={styles.caixa}>
      <View style={styles.cabecalho}>
        <View style={styles.titulo}>
          <ThemedText type="heading" accessibilityRole="header">
            Chamar {plural(funcao).toLowerCase()}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {quando}
          </ThemedText>
        </View>
        <Button title="Fechar" variant="ghost" bloco={false} icone={XIcon} onPress={onFechar} />
      </View>

      {resultado === null ? <EsqueletoLista linhas={2} /> : null}
      {resultado?.erro ? <Aviso tipo="erro">{resultado.erro}</Aviso> : null}

      {resultado && !resultado.erro && resultado.lista.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          Ninguém livre para essa função no momento. Todos já estão escalados em alguma missa.
        </ThemedText>
      ) : null}

      {resultado?.lista.map((c, i) => (
        <View key={`${c.pessoaNome}-${c.responsavelNome}-${i}`}>
          {i > 0 ? <Divisor /> : null}
          <View style={styles.contato}>
            <View style={styles.titulo}>
              <ThemedText type="strong">{c.pessoaNome}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Responsável: {c.responsavelNome}
              </ThemedText>
            </View>
            {c.link ? (
              <Button
                title="WhatsApp"
                variant="secondary"
                bloco={false}
                icone={WhatsappLogoIcon}
                accessibilityLabel={`Chamar o responsável de ${c.pessoaNome} pelo WhatsApp`}
                onPress={() => {
                  if (c.link) void Linking.openURL(c.link);
                }}
              />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Sem celular cadastrado
              </ThemedText>
            )}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  caixa: {
    gap: Spacing.three,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titulo: {
    flex: 1,
    gap: Spacing.half,
  },
  contato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
