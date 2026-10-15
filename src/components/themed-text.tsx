import { StyleSheet, Text, type TextProps } from 'react-native';

import { FonteTitulo, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Escala tipográfica (docs/DIRECAO-VISUAL.md, seção 4).
 * Spectral só em `title`, `subtitle`, `heading` e `numeral`; todo o resto usa a fonte do sistema.
 */
export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'strong'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'numeral'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const cor = theme[themeColor ?? (type === 'link' ? 'accent' : 'text')];

  return <Text style={[{ color: cor }, ESTILOS[type], style]} {...rest} />;
}

const ESTILOS = StyleSheet.create({
  // Títulos (Spectral). Sem `fontWeight`: o peso já faz parte do nome da fonte.
  title: {
    fontFamily: FonteTitulo,
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: FonteTitulo,
    fontSize: 26,
    lineHeight: 32,
  },
  heading: {
    fontFamily: FonteTitulo,
    fontSize: 20,
    lineHeight: 26,
  },
  numeral: {
    fontFamily: FonteTitulo,
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  // Interface (sistema)
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  strong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  link: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
