import { cubicBezier, Easing } from 'react-native-reanimated';

/**
 * Orçamento de movimento do app (docs/DIRECAO-VISUAL.md, seção 8).
 * Modo "operar": curto, só para estado, nada de coreografia de carregamento.
 * Tudo aqui respeita "reduzir movimento" do sistema (ver `ReducedMotionConfig` em src/app/_layout.tsx).
 */
export const Movimento = {
  /** resposta ao toque: tem que parecer imediata */
  toque: 120,
  /** troca de tom: hover, seleção, foco */
  estado: 140,
  /** algo aparece */
  entrada: 180,
  /** algo some: sempre mais rápido do que entrou */
  saida: 120,
  /** conteúdo trocado por uma aba ou por um dia */
  troca: 150,
  /** intervalo entre itens da primeira lista */
  escalonamento: 40,
  /** nunca escalonar além disto: depois de 6 itens, entram juntos */
  escalonamentoMaximo: 6,
  /** pulso do esqueleto (o único movimento contínuo) */
  pulso: 1200,
  /** escala ao pressionar (0,95 a 0,98: sutil, mas sentido) */
  escala: 0.97,
} as const;

/** ease-out forte: arranca rápido e assenta; o `ease-out` padrão é fraco demais para parecer intencional. */
export const EaseOut = cubicBezier(0.23, 1, 0.32, 1);

/** Equivalente para as animações de entrada/saída (layout animations). */
export const EaseOutEntrada = Easing.out(Easing.cubic);

/** Valores de deslocamento usados nas entradas (px). Pequenos: nada vem "de fora da tela". */
export const Deslocamento = {
  aviso: 6,
  lista: 8,
} as const;
