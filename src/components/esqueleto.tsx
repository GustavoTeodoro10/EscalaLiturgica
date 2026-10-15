import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Divisor } from '@/components/card';
import { Movimento } from '@/constants/movimento';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EsqueletoProps = {
  largura?: DimensionValue;
  altura?: number;
  raio?: number;
};

/** Bloco neutro que ocupa o lugar do conteúdo enquanto ele carrega. */
export function Esqueleto({ largura = '100%', altura = 14, raio = 6 }: EsqueletoProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: largura, height: altura, borderRadius: raio, backgroundColor: theme.line }}
    />
  );
}

/**
 * Esqueleto no formato de uma lista de compromissos (bloco de data + duas linhas).
 * É o único movimento contínuo do app: um pulso lento de opacidade, aplicado no conjunto
 * (um só elemento animado, não um por barra). Com "reduzir movimento", fica parado.
 */
export function EsqueletoLista({ linhas = 3 }: { linhas?: number }) {
  const reduzir = useReducedMotion();

  return (
    <Animated.View
      accessible
      accessibilityLabel="Carregando"
      accessibilityState={{ busy: true }}
      style={[
        styles.lista,
        reduzir
          ? null
          : {
              animationName: { from: { opacity: 0.55 }, to: { opacity: 1 } },
              animationDuration: Movimento.pulso,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            },
      ]}>
      {Array.from({ length: linhas }, (_, i) => (
        <View key={i}>
          {i > 0 ? <Divisor /> : null}
          <View style={styles.linha}>
            <View style={styles.data}>
              <Esqueleto largura={36} altura={28} raio={Radius.field} />
              <Esqueleto largura={44} altura={10} />
            </View>
            <View style={styles.texto}>
              <Esqueleto largura="60%" altura={16} />
              <Esqueleto largura="85%" altura={12} />
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: 0,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  data: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.one,
  },
  texto: {
    flex: 1,
    gap: Spacing.two,
  },
});
