/**
 * Tokens visuais do app. Direção em docs/DIRECAO-VISUAL.md.
 * Para validar o contraste desta paleta: `npm run contraste`.
 *
 * Regras:
 *  - um único acento (vinho); dourado só como cor semântica de "atenção";
 *  - superfícies mais claras que o fundo, separadas por filete (sem blocos bege escuros);
 *  - `border` é a borda de CONTROLES (campos), com contraste mínimo de 3:1; `line` é só separador.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A241E',
    textSecondary: '#6B6154',
    background: '#F4EEE0',
    surface: '#FBF8F0',
    line: '#DCD0B4',
    border: '#8C8068',
    hover: '#EFE8D5',
    accent: '#7A2331',
    onAccent: '#FFFFFF',
    accentSoft: '#EFDCD8',
    attentionText: '#7A4F00',
    attentionSoft: '#F3E3B5',
    danger: '#B5380A',
    success: '#2F5D3A',
    // aliases usados por componentes do template
    backgroundElement: '#FBF8F0',
    backgroundSelected: '#EFDCD8',
  },
  dark: {
    text: '#F1EADB',
    textSecondary: '#B7AD9A',
    background: '#1B1612',
    surface: '#26201A',
    line: '#3A3128',
    border: '#847762',
    hover: '#2F2820',
    accent: '#D9788A',
    onAccent: '#1B1612',
    accentSoft: '#3E2229',
    attentionText: '#E8C26B',
    attentionSoft: '#3D3016',
    danger: '#FF9A6B',
    success: '#7DBE8C',
    backgroundElement: '#26201A',
    backgroundSelected: '#3E2229',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Spectral (títulos e numerais) é carregada em src/app/_layout.tsx. */
export const FonteTitulo = 'Spectral_600SemiBold';

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Trava de forma: contêineres 16, campos 12, controles pequenos em pílula. */
export const Radius = {
  container: 16,
  field: 12,
  pill: 999,
} as const;

/** Alvo de toque mínimo (WCAG 2.5.8 pede 24; usamos 44 por causa de quem usa com uma mão). */
export const TouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
/** Largura de leitura das telas de conteúdo. */
export const ContentWidth = 560;
