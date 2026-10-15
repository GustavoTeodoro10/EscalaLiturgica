import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Calendario } from '@/components/calendario';
import { Card, Divisor } from '@/components/card';
import { Chip } from '@/components/chip';
import { EstadoVazio } from '@/components/estado-vazio';
import { EsqueletoLista } from '@/components/esqueleto';
import { CalendarBlankIcon, UsersIcon } from '@/components/icones';
import { Screen } from '@/components/screen';
import { Participacao } from './participacao';
import { ThemedText } from '@/components/themed-text';
import { ENTRA_TROCA } from '@/constants/entradas';
import { Radius, Spacing } from '@/constants/theme';
import { useEventos } from '@/hooks/use-eventos';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { Evento, Pessoa, Vaga } from '@/types';
import { partesDaData, paraData, somarMeses } from '@/utils/calendario';
import {
  diasComVaga,
  eventosComVagaNoDia,
  faltamParaMinimo,
  funcoesAtivasDe,
  primeiroDiaComVaga,
  rotuloDaVaga,
  vagasAbertasPara,
} from '@/utils/eventos';

type Resultado = { tipo: 'ok' | 'erro'; texto: string };

export function Vagas() {
  const { sessao } = useSession();
  const { eventos, erro, atualizando, recarregar, inscrever } = useEventos();
  const theme = useTheme();

  const pessoas = sessao?.pessoas ?? [];
  const [indice, setIndice] = useState(0);
  const pessoa: Pessoa | null = pessoas[Math.min(indice, pessoas.length - 1)] ?? null;

  // null = acompanha automaticamente a primeira data com vaga
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const [mesEscolhido, setMesEscolhido] = useState<{ ano: number; mes: number } | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Resultado | null>(null);

  // sair da aba apaga a confirmação: ela pode ficar desatualizada (ex.: inscrição cancelada na Agenda)
  useFocusEffect(
    useCallback(() => {
      return () => setAviso(null);
    }, []),
  );

  const funcoesDela = pessoa ? funcoesAtivasDe(pessoa) : [];
  const variasFuncoes = funcoesDela.length > 1;
  const lista: Evento[] = eventos ?? [];
  const marcados = pessoa ? diasComVaga(lista, pessoa) : new Set<string>();
  const primeiroDia = pessoa ? primeiroDiaComVaga(lista, pessoa) : null;
  const diaAtivo = diaEscolhido && marcados.has(diaEscolhido) ? diaEscolhido : primeiroDia;

  const referencia = (diaAtivo ? paraData(diaAtivo) : null) ?? new Date();
  const mesVisivel = mesEscolhido ?? { ano: referencia.getFullYear(), mes: referencia.getMonth() };

  const doDia = pessoa && diaAtivo ? eventosComVagaNoDia(lista, pessoa, diaAtivo) : [];
  const tituloDoDia = diaAtivo ? partesDaData(diaAtivo)?.porExtenso : null;

  function trocarPessoa(i: number) {
    setIndice(i);
    setDiaEscolhido(null);
    setMesEscolhido(null);
    setAviso(null);
  }

  async function servir(evento: Evento, vaga: Vaga) {
    if (!pessoa || enviando) return;
    setEnviando(`${evento.id}:${vaga.funcaoId}`);
    setAviso(null);
    setMesEscolhido(mesVisivel); // não "pula" de mês depois que o dia deixar de ter vaga
    const mensagem = await inscrever(evento.id, pessoa, vaga.funcaoId);
    setEnviando(null);
    setAviso(
      mensagem
        ? { tipo: 'erro', texto: mensagem }
        : { tipo: 'ok', texto: `${pessoa.nome} está escalado(a) como ${vaga.funcao} em ${evento.data} às ${evento.horario}.` },
    );
  }

  if (!sessao) return null;

  return (
    <Screen
      title="Vagas disponíveis"
      subtitle="Escolha um dia marcado no calendário para ver as missas com vagas abertas."
      onRefresh={recarregar}
      refreshing={atualizando && eventos !== null}>
      {pessoas.length === 0 ? (
        <Card>
          <EstadoVazio
            icone={UsersIcon}
            titulo="Nenhuma pessoa no seu cadastro"
            texto="Procure a secretaria da paróquia para incluir quem vai servir no seu cadastro."
          />
        </Card>
      ) : (
        <>
          {pessoas.length > 1 ? (
            <View style={styles.chips} accessibilityRole="radiogroup">
              {pessoas.map((p, i) => (
                <Chip key={p.id} rotulo={p.nome} ativo={p.id === pessoa?.id} onPress={() => trocarPessoa(i)} />
              ))}
            </View>
          ) : null}

          {pessoa && funcoesDela.length > 0 ? (
            <ThemedText themeColor="textSecondary">
              Vagas de {funcoesDela.map((f) => f.funcao).join(', ')} para {pessoa.nome}.
            </ThemedText>
          ) : null}
          {pessoa && funcoesDela.length === 0 ? (
            <Aviso tipo="info">
              {`${pessoa.nome} ainda não participa de nenhuma função. Peça para participar abaixo e aguarde o coordenador aprovar.`}
            </Aviso>
          ) : null}

          {erro ? (
            <View style={styles.coluna}>
              <Aviso tipo="erro">{erro}</Aviso>
              <Button title="Tentar de novo" variant="secondary" onPress={recarregar} />
            </View>
          ) : null}

          {eventos === null && !erro ? <EsqueletoLista linhas={2} /> : null}

          {eventos !== null ? (
            <>
              <Calendario
                ano={mesVisivel.ano}
                mes={mesVisivel.mes}
                diasMarcados={marcados}
                selecionado={diaAtivo}
                onSelecionar={(d) => {
                  setDiaEscolhido(d);
                  setAviso(null);
                }}
                onMudarMes={(delta) => setMesEscolhido(somarMeses(mesVisivel.ano, mesVisivel.mes, delta))}
              />

              {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

              {marcados.size === 0 ? (
                <Card>
                  <EstadoVazio
                    icone={CalendarBlankIcon}
                    titulo="Nenhuma missa com vaga"
                    texto={`Quando a coordenação abrir novas missas para ${pessoa?.nome ?? 'seus filhos'}, elas aparecem aqui. Puxe a tela para atualizar.`}
                  />
                </Card>
              ) : null}

              {doDia.length > 0 ? (
                <Animated.View
                  key={`${pessoa?.id}:${diaAtivo}`}
                  entering={ENTRA_TROCA}
                  style={styles.coluna}>
                  {tituloDoDia ? (
                    <ThemedText type="heading" accessibilityRole="header">
                      {tituloDoDia.charAt(0).toUpperCase() + tituloDoDia.slice(1)}
                    </ThemedText>
                  ) : null}

                  <Card style={styles.lista}>
                    {doDia.flatMap((evento) =>
                      pessoa ? vagasAbertasPara(evento, pessoa).map((vaga) => ({ evento, vaga })) : [],
                    ).map(({ evento, vaga }, i) => {
                      if (!pessoa) return null;
                      const faltam = faltamParaMinimo(vaga);
                      const chave = `${evento.id}:${vaga.funcaoId}`;
                      return (
                        <View key={chave}>
                          {i > 0 ? <Divisor /> : null}
                          <View style={styles.linha}>
                            <View style={styles.horario}>
                              <ThemedText type="numeral">{evento.horario}</ThemedText>
                              <View style={styles.horarioTexto}>
                                {evento.descricao ? <ThemedText type="strong">{evento.descricao}</ThemedText> : null}
                                {variasFuncoes ? (
                                  <ThemedText type="small" themeColor="textSecondary">
                                    {rotuloDaVaga(vaga, true)}
                                  </ThemedText>
                                ) : null}
                                <ThemedText type="small" themeColor="textSecondary">
                                  {vaga.escalados.length} de {vaga.maximo} vagas ocupadas
                                </ThemedText>
                                {faltam > 0 ? (
                                  <View style={[styles.etiqueta, { backgroundColor: theme.attentionSoft }]}>
                                    <ThemedText type="caption" style={{ color: theme.attentionText }}>
                                      Faltam {faltam} para o mínimo
                                    </ThemedText>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                            <Button
                              title={`Escalar ${pessoa.nome}`}
                              onPress={() => servir(evento, vaga)}
                              loading={enviando === chave}
                              disabled={enviando !== null}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                </Animated.View>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {pessoas.length > 0 ? <Participacao pessoas={pessoas} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
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
  horario: {
    gap: Spacing.one,
  },
  horarioTexto: {
    gap: Spacing.half,
  },
  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    marginTop: Spacing.one,
  },
});
