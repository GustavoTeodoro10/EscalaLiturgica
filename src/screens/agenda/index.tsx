import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Aviso } from '@/components/aviso';
import { BlocoData } from '@/components/bloco-data';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { EntradaLista } from '@/components/entrada-lista';
import { EstadoVazio } from '@/components/estado-vazio';
import { EsqueletoLista } from '@/components/esqueleto';
import { CalendarBlankIcon, SignOutIcon, XIcon } from '@/components/icones';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ENTRA_FADE, SAI } from '@/constants/entradas';
import { Spacing } from '@/constants/theme';
import { useEventos } from '@/hooks/use-eventos';
import { useSession } from '@/hooks/use-session';
import { agruparPorData, compromissosDe, rotuloDaVaga } from '@/utils/eventos';

export function Agenda() {
  const router = useRouter();
  const { sessao, sair } = useSession();
  const { eventos, erro, atualizando, recarregar, cancelar } = useEventos();

  // chave "eventoId:pessoaId" do compromisso aguardando confirmação de cancelamento
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // sair da aba apaga a confirmação e qualquer cancelamento pendente
  useFocusEffect(
    useCallback(() => {
      return () => {
        setMensagem(null);
        setConfirmando(null);
      };
    }, []),
  );

  if (!sessao) return null;

  const compromissos = eventos ? compromissosDe(eventos, sessao.pessoas) : [];
  const grupos = agruparPorData(compromissos);
  const primeiroNome = sessao.responsavel.split(' ')[0];

  // só mostra a pastoral junto da função quando a família participa de mais de uma
  const variasPastorais = new Set(sessao.pessoas.flatMap((p) => p.membros.map((m) => m.pastoralId))).size > 1;

  async function confirmarCancelamento(eventoId: string, pessoaId: string, funcaoId: string) {
    const pessoa = sessao?.pessoas.find((p) => p.id === pessoaId);
    if (!pessoa) return;
    const chave = `${eventoId}:${pessoaId}:${funcaoId}`;
    setCancelando(chave);
    setMensagem(null);
    const falha = await cancelar(eventoId, pessoa, funcaoId);
    setCancelando(null);
    setConfirmando(null);
    setMensagem(falha ? { tipo: 'erro', texto: falha } : { tipo: 'ok', texto: `Inscrição de ${pessoa.nome} cancelada.` });
  }

  return (
    <Screen
      title="Agenda da família"
      subtitle={`Olá, ${primeiroNome}. Estas são as missas em que sua família está escalada.`}
      onRefresh={recarregar}
      refreshing={atualizando && eventos !== null}>
      {mensagem ? <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso> : null}

      {erro ? (
        <View style={styles.coluna}>
          <Aviso tipo="erro">{erro}</Aviso>
          <Button title="Tentar de novo" variant="secondary" onPress={recarregar} />
        </View>
      ) : null}

      {eventos === null && !erro ? <EsqueletoLista linhas={3} /> : null}

      {eventos !== null && compromissos.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={CalendarBlankIcon}
            titulo="Nenhuma missa agendada"
            texto="Escolha uma missa com vaga e escale seus filhos."
            acao={{ rotulo: 'Ver vagas', onPress: () => router.push('/vagas') }}
          />
        </Card>
      ) : null}

      {grupos.length > 0 ? (
        <Card style={styles.lista}>
          {grupos.map((grupo, g) => (
            <EntradaLista key={grupo.data} indice={g}>
              {g > 0 ? <Divisor /> : null}
              {/* Um dia, um bloco de data: vários filhos na mesma data ficam juntos. */}
              <View style={styles.grupo}>
                <BlocoData data={grupo.data} />
                <View style={styles.itens}>
                  {grupo.itens.map(({ evento, pessoa, vaga }, i) => {
                    const chave = `${evento.id}:${pessoa.id}:${vaga.funcaoId}`;
                    const pedindoConfirmacao = confirmando === chave;
                    return (
                      <View key={chave} style={styles.item}>
                        {i > 0 ? <Divisor /> : null}
                        <View style={styles.texto}>
                          <ThemedText type="strong">{pessoa.nome}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {rotuloDaVaga(vaga, variasPastorais)} às {evento.horario}
                          </ThemedText>
                          {evento.descricao ? (
                            <ThemedText type="small" themeColor="textSecondary">
                              {evento.descricao}
                            </ThemedText>
                          ) : null}
                        </View>

                        {pedindoConfirmacao ? (
                          <Animated.View style={styles.confirmacao} entering={ENTRA_FADE} exiting={SAI}>
                            <ThemedText type="small" accessibilityRole="alert">
                              Cancelar a inscrição de {pessoa.nome} nesta missa?
                            </ThemedText>
                            <View style={styles.acoes}>
                              <View style={styles.acao}>
                                <Button
                                  title="Sim, cancelar"
                                  variant="danger"
                                  onPress={() => confirmarCancelamento(evento.id, pessoa.id, vaga.funcaoId)}
                                  loading={cancelando === chave}
                                />
                              </View>
                              <View style={styles.acao}>
                                <Button
                                  title="Voltar"
                                  variant="secondary"
                                  onPress={() => setConfirmando(null)}
                                  disabled={cancelando === chave}
                                />
                              </View>
                            </View>
                          </Animated.View>
                        ) : (
                          <Button
                            title="Cancelar inscrição"
                            variant="ghost"
                            bloco={false}
                            alinhado
                            icone={XIcon}
                            accessibilityLabel={`Cancelar inscrição de ${pessoa.nome}`}
                            onPress={() => {
                              setMensagem(null);
                              setConfirmando(chave);
                            }}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </EntradaLista>
          ))}
        </Card>
      ) : null}

      <Button title="Sair" variant="ghost" bloco={false} alinhado icone={SignOutIcon} onPress={sair} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.three,
  },
  lista: {
    gap: 0,
    paddingVertical: 0,
  },
  grupo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  itens: {
    flex: 1,
    gap: Spacing.three,
  },
  item: {
    gap: Spacing.two,
  },
  texto: {
    gap: Spacing.half,
  },
  confirmacao: {
    gap: Spacing.two,
  },
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acao: {
    flex: 1,
  },
});
