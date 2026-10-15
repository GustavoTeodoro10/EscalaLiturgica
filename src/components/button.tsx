import { ActivityIndicator, StyleSheet, View, type PressableProps } from 'react-native';

import type { Icon } from '@/components/icones';
import { ThemedText } from '@/components/themed-text';
import { Toque } from '@/components/toque';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Ícone à esquerda do rótulo (Phosphor). */
  icone?: Icon;
  /** Ocupa a largura toda do contêiner. */
  bloco?: boolean;
  /**
   * Só para `ghost` fora do bloco: puxa o botão para a esquerda pelo tamanho do seu preenchimento,
   * de modo que o TEXTO alinhe com o texto ao redor (a área de toque continua inteira).
   */
  alinhado?: boolean;
};

export function Button({
  title,
  loading,
  variant = 'primary',
  icone: Icone,
  bloco = true,
  alinhado = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const bloqueado = !!(disabled || loading);

  const cores = {
    primary: { fundo: theme.accent, texto: theme.onAccent, borda: theme.accent },
    danger: { fundo: theme.danger, texto: theme.onAccent, borda: theme.danger },
    secondary: { fundo: theme.surface, texto: theme.text, borda: theme.border },
    ghost: { fundo: 'transparent', texto: theme.accent, borda: 'transparent' },
  }[variant];

  const preenchido = variant === 'primary' || variant === 'danger';
  const lavagem = variant === 'ghost' ? theme.accentSoft : theme.hover;

  return (
    <Toque
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: bloqueado, busy: !!loading }}
      disabled={bloqueado}
      estiloExterno={[
        bloco ? styles.bloco : styles.auto,
        alinhado && variant === 'ghost' && !bloco && { marginLeft: -Spacing.two },
      ]}
      estiloInterno={({ hovered }) => [
        styles.base,
        variant === 'ghost' && styles.compacto,
        {
          backgroundColor: hovered && !preenchido && !bloqueado ? lavagem : cores.fundo,
          borderColor: cores.borda,
          opacity: bloqueado ? 0.5 : preenchido && hovered ? 0.92 : 1,
        },
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={cores.texto} />
      ) : (
        <View style={styles.conteudo}>
          {Icone ? <Icone size={20} color={cores.texto} /> : null}
          <ThemedText style={[styles.rotulo, { color: cores.texto }]} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
      )}
    </Toque>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: TouchTarget,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compacto: {
    paddingHorizontal: Spacing.two,
  },
  bloco: {
    alignSelf: 'stretch',
  },
  auto: {
    alignSelf: 'flex-start',
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  rotulo: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
});
