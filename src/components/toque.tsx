import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { EaseOut, Movimento } from '@/constants/movimento';

/** react-native-web acrescenta `hovered` ao estado do Pressable; os tipos do RN não conhecem. */
export type EstadoToque = { pressed: boolean; hovered: boolean; disabled: boolean };

type ToqueProps = Omit<PressableProps, 'style' | 'children'> & {
  /** Layout do alvo de toque (alinhamento, largura, margem). Sem aparência. */
  estiloExterno?: StyleProp<ViewStyle>;
  /** Aparência. Recebe o estado e devolve cores/forma; a escala e as transições são do componente. */
  estiloInterno: (estado: EstadoToque) => StyleProp<ViewStyle>;
  /** Escala ao pressionar; 1 desliga. */
  escala?: number;
  children: ReactNode | ((estado: EstadoToque) => ReactNode);
};

/**
 * Base de tudo que se toca. Separa o alvo de toque (Pressable, fixo) do que se vê (Animated.View):
 * assim a escala não mexe na área de toque e as trocas de tom viram transições, não saltos.
 *
 * Sem `:active` animado o botão parece "morto"; com 120 ms de ease-out ele parece ouvir.
 */
export function Toque({
  estiloExterno,
  estiloInterno,
  escala = Movimento.escala,
  children,
  disabled,
  ...rest
}: ToqueProps) {
  const reduzir = useReducedMotion();

  return (
    <Pressable disabled={disabled} style={estiloExterno} {...rest}>
      {(estadoBruto) => {
        const { pressed, hovered } = estadoBruto as { pressed: boolean; hovered?: boolean };
        const estado: EstadoToque = { pressed, hovered: !!hovered, disabled: !!disabled };
        const comprimido = pressed && !disabled && !reduzir;

        return (
          <Animated.View
            style={[
              estiloInterno(estado),
              {
                transform: [{ scale: comprimido ? escala : 1 }],
                transitionProperty: ['transform', 'backgroundColor', 'borderColor', 'opacity'],
                transitionDuration: reduzir ? 0 : Movimento.toque,
                transitionTimingFunction: EaseOut,
              },
            ]}>
            {typeof children === 'function' ? children(estado) : children}
          </Animated.View>
        );
      }}
    </Pressable>
  );
}
