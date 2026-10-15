import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Aviso } from '@/components/aviso';
import { BlocoData } from '@/components/bloco-data';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { PencilSimpleIcon, PlusIcon, WhatsappLogoIcon, XIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Toque } from '@/components/toque';
import { ENTRA_FADE, SAI } from '@/constants/entradas';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/types';
import { partesDaData } from '@/utils/calendario';
import { faltamParaMinimo } from '@/utils/eventos';
import { plural } from '@/utils/rotulos';

import type { PedidoChamada } from './chamar';
import { FormEdicao } from './form-edicao';

type MissaCardProps = {
  evento: Evento;
  onChamar: (pedido: PedidoChamada) => void;
};

export function MissaCard({ evento, onChamar }: MissaCardProps) {
  const { membros, escalar, remover } = usePainel();
  const theme = useTheme();

  const [editando, setEditando] = useState(false);
  const [adicionando, setAdicionando] = useState<string | null>(null); // id da função com a lista aberta
  const [confirmando, setConfirmando] = useState<string | null>(null); // "remover:<pessoaId>:<funcaoId>"
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const p = partesDaData(evento.data);
  const quando = `${p ? p.porExtenso.charAt(0).toUpperCase() + p.porExtenso.slice(1) : evento.data} às ${evento.horario}`;
  const abaixoDoMinimo = evento.vagas.some((v) => faltamParaMinimo(v) > 0);

  async function executar(acao: () => Promise<string | null>) {
    setOcupado(true);
    setMensagem(null);
    const falha = await acao();
    setOcupado(false);
    setConfirmando(null);
    if (falha) setMensagem(falha);
  }

  return (
    <Card style={styles.cartao}>
      <View style={styles.topo}>
        <BlocoData data={evento.data} />
        <View style={styles.topoTexto}>
          <ThemedText type="strong">Às {evento.horario}</ThemedText>
          {evento.descricao ? (
            <ThemedText type="small" themeColor="textSecondary">
              {evento.descricao}
            </ThemedText>
          ) : null}
          {abaixoDoMinimo ? (
            <View style={[styles.etiqueta, { backgroundColor: theme.attentionSoft }]}>
              <ThemedText type="caption" style={{ color: theme.attentionText }}>
                Abaixo do mínimo
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {mensagem ? <Aviso tipo="erro">{mensagem}</Aviso> : null}

      {editando ? (
        <Animated.View entering={ENTRA_FADE} exiting={SAI}>
          <FormEdicao evento={evento} onFechar={() => setEditando(false)} />
        </Animated.View>
      ) : (
        <>
          {evento.vagas.map((vaga) => {
            const candidatos = membros
              .filter((m) => m.funcaoId === vaga.funcaoId && m.situacao === 'ativo' && !vaga.escalados.includes(m.pessoaId))
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            const cheia = vaga.escalados.length >= vaga.maximo;

            return (
              <View key={vaga.funcaoId} style={styles.vaga}>
                <Divisor />
                <ThemedText type="strong">
                  {plural(vaga.funcao)}{' '}
                  <ThemedText type="small" themeColor="textSecondary">
                    {vaga.escalados.length} de {vaga.minimo} a {vaga.maximo}
                  </ThemedText>
                </ThemedText>

                <View style={styles.chips}>
                  {vaga.escalados.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Ninguém escalado ainda.
                    </ThemedText>
                  ) : null}
                  {vaga.escalados.map((id, i) => {
                    const nome = vaga.nomes?.[i] ?? 'Sem nome';
                    const chave = `remover:${id}:${vaga.funcaoId}`;
                    return confirmando === chave ? (
                      <Animated.View key={id} style={styles.confirmaRemocao} entering={ENTRA_FADE} exiting={SAI}>
                        <ThemedText type="small">Remover {nome}?</ThemedText>
                        <Button
                          title="Sim, remover"
                          variant="danger"
                          bloco={false}
                          onPress={() => executar(() => remover(evento.id, id, vaga.funcaoId))}
                          loading={ocupado}
                        />
                        <Button title="Voltar" variant="secondary" bloco={false} onPress={() => setConfirmando(null)} />
                      </Animated.View>
                    ) : (
                      <Toque
                        key={id}
                        onPress={() => setConfirmando(chave)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${nome} desta missa`}
                        estiloInterno={({ hovered }) => [
                          styles.nome,
                          {
                            backgroundColor: hovered ? theme.hover : theme.surface,
                            borderColor: theme.border,
                          },
                        ]}>
                        <ThemedText type="small">{nome}</ThemedText>
                        <XIcon size={16} color={theme.textSecondary} />
                      </Toque>
                    );
                  })}
                </View>

                {!cheia ? (
                  <View style={styles.acoes}>
                    <View style={styles.acao}>
                      <Button
                        title={adicionando === vaga.funcaoId ? 'Fechar lista' : 'Adicionar'}
                        variant="secondary"
                        icone={adicionando === vaga.funcaoId ? XIcon : PlusIcon}
                        onPress={() => setAdicionando(adicionando === vaga.funcaoId ? null : vaga.funcaoId)}
                      />
                    </View>
                    <View style={styles.acao}>
                      <Button
                        title="Chamar famílias"
                        variant="secondary"
                        icone={WhatsappLogoIcon}
                        onPress={() =>
                          onChamar({ eventoId: evento.id, funcaoId: vaga.funcaoId, funcao: vaga.funcao, quando })
                        }
                      />
                    </View>
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Limite de vagas atingido.
                  </ThemedText>
                )}

                {adicionando === vaga.funcaoId ? (
                  <Animated.View style={styles.chips} entering={ENTRA_FADE} exiting={SAI}>
                    {candidatos.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Todos os membros dessa função já estão escalados.
                      </ThemedText>
                    ) : null}
                    {candidatos.map((c) => (
                      <Toque
                        key={c.pessoaId}
                        disabled={ocupado}
                        onPress={() => executar(() => escalar(evento.id, c.pessoaId, vaga.funcaoId))}
                        accessibilityRole="button"
                        accessibilityLabel={`Escalar ${c.nome}`}
                        estiloInterno={({ hovered }) => [
                          styles.nome,
                          {
                            backgroundColor: hovered ? theme.accentSoft : theme.surface,
                            borderColor: theme.accent,
                            opacity: ocupado ? 0.5 : 1,
                          },
                        ]}>
                        <PlusIcon size={16} color={theme.accent} />
                        <ThemedText type="small" style={{ color: theme.accent }}>
                          {c.nome}
                        </ThemedText>
                      </Toque>
                    ))}
                  </Animated.View>
                ) : null}
              </View>
            );
          })}

          <Divisor />
          <Button title="Ajustar vagas" variant="secondary" icone={PencilSimpleIcon} onPress={() => setEditando(true)} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: Spacing.three,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  topoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    marginTop: Spacing.one,
  },
  vaga: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  nome: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  confirmaRemocao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  acao: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
