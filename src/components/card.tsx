import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Contêiner: superfície mais clara que o fundo, filete de 1 px, raio 16. Sem sombra. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }, style]} {...rest} />;
}

/** Filete horizontal entre linhas de uma lista. */
export function Divisor() {
  const theme = useTheme();
  return <View style={[styles.divisor, { backgroundColor: theme.line }]} accessibilityElementsHidden />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.container,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  divisor: {
    height: 1,
    alignSelf: 'stretch',
  },
});
