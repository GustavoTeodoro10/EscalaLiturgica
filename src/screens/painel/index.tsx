import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EsqueletoLista } from '@/components/esqueleto';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ENTRA_TROCA } from '@/constants/entradas';
import { Spacing } from '@/constants/theme';
import { PainelProvider, usePainel } from '@/hooks/use-painel';
import { useSession } from '@/hooks/use-session';

import { ChamarFamilias, type PedidoChamada } from './chamar';
import { Lembretes } from './lembretes';
import { Membros } from './membros';
import { Missas } from './missas';
import { Resumo } from './resumo';

type Aba = 'resumo' | 'missas' | 'membros' | 'lembretes';

export function Painel() {
  const { sessao } = useSession();
  const pastorais = sessao?.pastoraisCoordenadas ?? [];
  const [escolhida, setEscolhida] = useState<string | null>(null);

  // O servidor também recusa; aqui evitamos mostrar uma tela que só daria erro.
  if (pastorais.length === 0) {
    return (
      <Screen title="Painel da pastoral">
        <Aviso tipo="info">Esta área é restrita a quem coordena uma pastoral.</Aviso>
      </Screen>
    );
  }

  const pastoral = pastorais.find((p) => p.id === escolhida) ?? pastorais[0];

  return (
    // key: trocar de pastoral descarta o estado (aba, chamada aberta) e recarrega os dados
    <PainelProvider key={pastoral.id} pastoral={pastoral}>
      <PainelConteudo
        escolhaDePastoral={
          pastorais.length > 1 ? (
            <View style={styles.abas} accessibilityRole="radiogroup">
              {pastorais.map((p) => (
                <Chip key={p.id} rotulo={p.nome} ativo={p.id === pastoral.id} onPress={() => setEscolhida(p.id)} />
              ))}
            </View>
          ) : null
        }
      />
    </PainelProvider>
  );
}

function PainelConteudo({ escolhaDePastoral }: { escolhaDePastoral: React.ReactNode }) {
  const { pastoral, resumo, eventos, erro, atualizando, recarregar, versao } = usePainel();
  const [aba, setAba] = useState<Aba>('resumo');
  const [chamada, setChamada] = useState<PedidoChamada | null>(null);

  const carregando = resumo === null && eventos === null && !erro;
  const pendentes = resumo?.pendentes ?? 0;

  const abas: { valor: Aba; rotulo: string }[] = [
    { valor: 'resumo', rotulo: 'Resumo' },
    { valor: 'missas', rotulo: 'Missas' },
    { valor: 'membros', rotulo: pendentes > 0 ? `Membros (${pendentes})` : 'Membros' },
    { valor: 'lembretes', rotulo: 'Lembretes' },
  ];

  return (
    <Screen
      title={pastoral.nome}
      subtitle="Missas, membros, lembretes e as pendências de hoje."
      onRefresh={recarregar}
      refreshing={atualizando && !carregando}>
      {escolhaDePastoral}

      <View style={styles.abas} accessibilityRole="tablist">
        {abas.map((a) => (
          <Chip key={a.valor} papel="tab" rotulo={a.rotulo} ativo={aba === a.valor} onPress={() => setAba(a.valor)} />
        ))}
      </View>

      {carregando ? <EsqueletoLista linhas={3} /> : null}

      {erro ? (
        <View style={styles.coluna}>
          <Aviso tipo="erro">{erro}</Aviso>
          <Button title="Tentar de novo" variant="secondary" onPress={recarregar} />
        </View>
      ) : null}

      {chamada ? (
        <ChamarFamilias
          key={`${chamada.eventoId}:${chamada.funcaoId}:${versao}`}
          pedido={chamada}
          onFechar={() => setChamada(null)}
        />
      ) : null}

      {resumo !== null || eventos !== null ? (
        <Animated.View key={aba} entering={ENTRA_TROCA} style={styles.coluna}>
          {aba === 'resumo' ? <Resumo onChamar={setChamada} /> : null}
          {aba === 'missas' ? <Missas onChamar={setChamada} /> : null}
          {aba === 'membros' ? <Membros /> : null}
          {aba === 'lembretes' ? <Lembretes /> : null}
        </Animated.View>
      ) : null}

      {!carregando && !erro && resumo === null && eventos === null ? (
        <ThemedText themeColor="textSecondary">Sem dados para mostrar.</ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  abas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  coluna: {
    gap: Spacing.three,
  },
});
