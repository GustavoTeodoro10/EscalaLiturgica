import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { WarningCircleIcon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { ENTRA_FADE, SAI } from '@/constants/entradas';
import { EaseOut, Movimento } from '@/constants/movimento';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CampoAnimado = Animated.createAnimatedComponent(TextInput);

type TextFieldProps = TextInputProps & {
  label: string;
  /** Texto de apoio, abaixo do campo. */
  ajuda?: string;
  /** Mensagem de erro, abaixo do campo (com ícone, nunca só cor). */
  erro?: string | null;
};

export function TextField({ label, ajuda, erro, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focado, setFocado] = useState(false);
  const reduzir = useReducedMotion();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <CampoAnimado
        accessibilityLabel={label}
        aria-invalid={!!erro}
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.accent}
        onFocus={(e) => {
          setFocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: erro ? theme.danger : focado ? theme.accent : theme.border,
            outlineColor: erro ? theme.danger : theme.accent,
            outlineWidth: focado ? 2 : 0,
            outlineOffset: 1,
            outlineStyle: 'solid',
            // a borda muda de cor em vez de saltar
            transitionProperty: ['borderColor', 'outlineColor'],
            transitionDuration: reduzir ? 0 : Movimento.estado,
            transitionTimingFunction: EaseOut,
          },
          style,
        ]}
        {...rest}
      />
      {erro ? (
        <Animated.View style={styles.mensagem} accessibilityRole="alert" entering={ENTRA_FADE} exiting={SAI}>
          <WarningCircleIcon size={18} color={theme.danger} weight="fill" />
          <ThemedText type="small" style={[styles.textoMensagem, { color: theme.danger }]}>
            {erro}
          </ThemedText>
        </Animated.View>
      ) : ajuda ? (
        <ThemedText type="small" themeColor="textSecondary">
          {ajuda}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.field,
    borderWidth: 1,
    fontSize: 16, // 16 px evita o zoom automático ao focar no iOS/Safari
  },
  mensagem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  textoMensagem: {
    flex: 1,
  },
});
