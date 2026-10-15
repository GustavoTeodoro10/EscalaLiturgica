import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Aviso } from '@/components/aviso';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EsqueletoLista } from '@/components/esqueleto';
import { Screen } from '@/components/screen';
import { ENTRA_TROCA } from '@/constants/entradas';
import { Spacing } from '@/constants/theme';
import { AdminProvider, useAdmin } from '@/hooks/use-admin';
import { useSession } from '@/hooks/use-session';

import { Gerar } from './gerar';
import { MissasAdmin } from './missas';
import { PastoraisAdmin } from './pastorais';

type Aba = 'missas' | 'gerar' | 'pastorais';

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'missas', rotulo: 'Missas' },
  { valor: 'gerar', rotulo: 'Gerar' },
  { valor: 'pastorais', rotulo: 'Pastorais' },
];

export function Administracao() {
  const { sessao } = useSession();

  // O servidor também recusa; aqui evitamos mostrar uma tela que só daria erro.
  if (!sessao?.administrador) {
    return (
      <Screen title="Administração">
        <Aviso tipo="info">Esta área é restrita à administração da paróquia.</Aviso>
      </Screen>
    );
  }

  return (
    <AdminProvider>
      <AdminConteudo />
    </AdminProvider>
  );
}

function AdminConteudo() {
  const { dados, erro, atualizando, recarregar } = useAdmin();
  const [aba, setAba] = useState<Aba>('missas');
  const carregando = dados === null && !erro;

  return (
    <Screen
      title="Administração"
      subtitle="Crie as missas e as pastorais da paróquia. Cada pastoral tem um coordenador que cuida dela."
      onRefresh={recarregar}
      refreshing={atualizando && !carregando}>
      <View style={styles.abas} accessibilityRole="tablist">
        {ABAS.map((a) => (
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

      {dados !== null ? (
        <Animated.View key={aba} entering={ENTRA_TROCA} style={styles.coluna}>
          {aba === 'missas' ? <MissasAdmin /> : null}
          {aba === 'gerar' ? <Gerar /> : null}
          {aba === 'pastorais' ? <PastoraisAdmin /> : null}
        </Animated.View>
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
