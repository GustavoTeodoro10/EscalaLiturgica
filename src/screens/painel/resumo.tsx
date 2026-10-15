import { StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/aviso';
import { BlocoData } from '@/components/bloco-data';
import { Button } from '@/components/button';
import { Card, Divisor } from '@/components/card';
import { EstadoVazio } from '@/components/estado-vazio';
import { CalendarBlankIcon, WhatsappLogoIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePainel } from '@/hooks/use-painel';
import { partesDaData } from '@/utils/calendario';
import { plural } from '@/utils/rotulos';

import type { PedidoChamada } from './chamar';

type ResumoProps = {
  onChamar: (pedido: PedidoChamada) => void;
};

function quandoPorExtenso(data: string, horario: string): string {
  const p = partesDaData(data);
  const base = p ? p.porExtenso : data;
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} às ${horario}`;
}

export function Resumo({ onChamar }: ResumoProps) {
  const { resumo } = usePainel();
  if (!resumo) return null;

  const { proximo, alertas } = resumo;

  return (
    <View style={styles.coluna}>
      {/* 1. O que precisa de ação agora */}
      <View style={styles.coluna}>
        <ThemedText type="heading" accessibilityRole="header">
          Precisa de atenção
        </ThemedText>

        {alertas.length === 0 ? (
          <Aviso tipo="ok">Nenhuma missa nos próximos 3 dias com menos da metade das vagas.</Aviso>
        ) : (
          <Card style={styles.lista}>
            {alertas.map((a, i) => {
              const quando = quandoPorExtenso(a.data, a.horario);
              return (
                <View key={a.eventoId}>
                  {i > 0 ? <Divisor /> : null}
                  <View style={styles.linha}>
                    <View style={styles.cabecalhoLinha}>
                      <BlocoData data={a.data} />
                      <View style={styles.texto}>
                        <ThemedText type="strong">Às {a.horario}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Só {a.ocupacaoPct}% preenchida
                        </ThemedText>
                        {a.vagas.map((v) => (
                          <ThemedText key={v.funcaoId} type="small" themeColor="textSecondary">
                            {plural(v.funcao)}: {v.ocupadas} de {v.maximo}
                          </ThemedText>
                        ))}
                      </View>
                    </View>
                    <View style={styles.acoes}>
                      {a.vagas
                        .filter((v) => v.ocupadas < v.maximo)
                        .map((v) => (
                          <View key={v.funcaoId} style={styles.acao}>
                            <Button
                              title={`Chamar ${plural(v.funcao).toLowerCase()}`}
                              variant="secondary"
                              icone={WhatsappLogoIcon}
                              onPress={() =>
                                onChamar({ eventoId: a.eventoId, funcaoId: v.funcaoId, funcao: v.funcao, quando })
                              }
                            />
                          </View>
                        ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>

      {/* 2. A próxima missa */}
      <View style={styles.coluna}>
        <ThemedText type="heading" accessibilityRole="header">
          Próxima missa
        </ThemedText>
        {proximo ? (
          <Card>
            <View style={styles.cabecalhoLinha}>
              <BlocoData data={proximo.data} />
              <View style={styles.texto}>
                <ThemedText type="strong">Às {proximo.horario}</ThemedText>
                {proximo.descricao ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {proximo.descricao}
                  </ThemedText>
                ) : null}
                {proximo.vagas.map((v) => {
                  const faltam = Math.max(0, v.minimo - v.ocupadas);
                  return (
                    <ThemedText key={v.funcaoId} type="small" themeColor={faltam > 0 ? 'attentionText' : 'textSecondary'}>
                      {plural(v.funcao)}: {v.ocupadas} de {v.minimo} a {v.maximo}
                      {faltam > 0 ? `, faltam ${faltam} para o mínimo` : ''}
                    </ThemedText>
                  );
                })}
              </View>
            </View>
          </Card>
        ) : (
          <Card>
            <EstadoVazio
              icone={CalendarBlankIcon}
              titulo="Nenhuma missa futura"
              texto="As missas são criadas pela administração da paróquia. Elas aparecem aqui assim que existirem."
            />
          </Card>
        )}
      </View>

      {/* 3. Panorama, como uma folha de conferência: rótulo à esquerda, valor à direita */}
      <View style={styles.coluna}>
        <ThemedText type="heading" accessibilityRole="header">
          Panorama
        </ThemedText>
        <Card style={styles.lista}>
          <Linha rotulo="Missas abaixo do mínimo" valor={String(resumo.missasAbaixoDoMinimo)} destaque={resumo.missasAbaixoDoMinimo > 0} />
          <Divisor />
          <Linha rotulo="Vagas abertas em 7 dias" valor={String(resumo.vagasAbertas7dias)} />
          <Divisor />
          <Linha rotulo="Ocupação das missas" valor={`${resumo.taxaOcupacao}%`} />
          <Divisor />
          <Linha rotulo="Membros ativos" valor={String(resumo.totalMembros)} />
          <Divisor />
          <Linha rotulo="Pedidos de entrada" valor={String(resumo.pendentes)} destaque={resumo.pendentes > 0} />
        </Card>
      </View>
    </View>
  );
}

function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.confere}>
      <ThemedText style={styles.confereRotulo}>{rotulo}</ThemedText>
      <ThemedText type="strong" themeColor={destaque ? 'attentionText' : 'text'} style={styles.confereValor}>
        {valor}
      </ThemedText>
    </View>
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
  linha: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  cabecalhoLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  texto: {
    flex: 1,
    gap: Spacing.half,
  },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  acao: {
    flexGrow: 1,
    flexBasis: 200,
  },
  confere: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  confereRotulo: {
    flex: 1,
  },
  confereValor: {
    fontVariant: ['tabular-nums'],
  },
});
