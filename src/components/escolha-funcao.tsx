import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Escolha, PastoralPublica } from '@/types';

export const ESCOLHA_VAZIA: Escolha = { pastoralId: '', funcaoId: '' };

type EscolhaFuncaoProps = {
  pastorais: PastoralPublica[];
  valor: Escolha;
  onChange: (proximo: Escolha) => void;
  /** funções que a pessoa já tem (não aparecem para escolher de novo) */
  jaTem?: Set<string>;
};

/** Escolhe a pastoral e a função. Com uma única pastoral, ela já vem escolhida e só pergunta a função. */
export function EscolhaFuncao({ pastorais, valor, onChange, jaTem }: EscolhaFuncaoProps) {
  const unica = pastorais.length === 1 ? pastorais[0] : null;
  const pastoralId = unica ? unica.id : valor.pastoralId;
  const pastoral = pastorais.find((p) => p.id === pastoralId) ?? null;
  const funcoes = (pastoral?.funcoes ?? []).filter((f) => !jaTem?.has(f.id));

  return (
    <View style={styles.coluna}>
      {unica ? null : (
        <View style={styles.coluna}>
          <ThemedText type="smallBold">Pastoral</ThemedText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {pastorais.map((p) => (
              <Chip
                key={p.id}
                rotulo={p.nome}
                ativo={p.id === pastoralId}
                onPress={() => onChange({ pastoralId: p.id, funcaoId: '' })}
              />
            ))}
          </View>
        </View>
      )}

      {pastoral ? (
        <View style={styles.coluna}>
          <ThemedText type="smallBold">{unica ? `Função em ${unica.nome}` : 'Função'}</ThemedText>
          {funcoes.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma função disponível nessa pastoral.
            </ThemedText>
          ) : (
            <View style={styles.chips} accessibilityRole="radiogroup">
              {funcoes.map((f) => (
                <Chip
                  key={f.id}
                  rotulo={f.nome}
                  ativo={f.id === valor.funcaoId && pastoralId === valor.pastoralId}
                  onPress={() => onChange({ pastoralId, funcaoId: f.id })}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
