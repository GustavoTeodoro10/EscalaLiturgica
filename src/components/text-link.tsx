import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TouchTarget } from '@/constants/theme';

type TextLinkProps = {
  rotulo: string;
  onPress: () => void;
};

/** Link de texto com área de toque confortável (mínimo 44 px). */
export function TextLink({ rotulo, onPress }: TextLinkProps) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.area} hitSlop={4}>
      <ThemedText type="link">{rotulo}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: {
    minHeight: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
