import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Toque } from '@/components/toque';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  /** `radio` para escolha única (padrão), `checkbox` para marcar várias ou `tab` para abas */
  papel?: 'radio' | 'checkbox' | 'tab';
  disabled?: boolean;
};

export function Chip({ rotulo, ativo, onPress, papel = 'radio', disabled }: ChipProps) {
  const theme = useTheme();

  return (
    <Toque
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={papel}
      // react-native-web não converte accessibilityState em ARIA: sem estes, o leitor de tela não sabe o que está marcado
      aria-checked={papel === 'tab' ? undefined : ativo}
      aria-selected={papel === 'tab' ? ativo : undefined}
      aria-disabled={disabled ? true : undefined}
      accessibilityState={
        papel === 'checkbox' ? { checked: ativo, disabled: !!disabled } : { selected: ativo, disabled: !!disabled }
      }
      estiloInterno={({ hovered }) => [
        styles.chip,
        {
          backgroundColor: ativo ? theme.accent : hovered ? theme.hover : theme.surface,
          borderColor: ativo ? theme.accent : theme.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: ativo ? theme.onAccent : theme.text }}>
        {rotulo}
      </ThemedText>
    </Toque>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
