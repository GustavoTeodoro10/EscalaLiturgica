import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { partesDaData } from '@/utils/calendario';

type BlocoDataProps = {
  /** dd/MM/yyyy */
  data: string;
};

/**
 * "Folha do missal": o dia em numeral serifado, com dia da semana e mês pequenos.
 * É o único gesto decorativo do app e também a informação que a pessoa procura primeiro.
 */
export function BlocoData({ data }: BlocoDataProps) {
  const partes = partesDaData(data);
  if (!partes) return null;

  return (
    <View style={styles.bloco} accessible accessibilityLabel={partes.porExtenso}>
      <ThemedText type="numeral" accessibilityElementsHidden importantForAccessibility="no">
        {partes.dia}
      </ThemedText>
      <ThemedText
        type="caption"
        themeColor="textSecondary"
        style={styles.legenda}
        accessibilityElementsHidden
        importantForAccessibility="no">
        {partes.diaSemana} {partes.mes}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.half,
  },
  legenda: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
