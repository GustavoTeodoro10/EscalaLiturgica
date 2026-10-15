import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Deslocamento, Movimento } from '@/constants/movimento';

/**
 * Entrada escalonada de um item da primeira lista, versão web.
 *
 * É animação CSS pura (`animationKeyframes` do react-native-web), de propósito: a entrada por
 * layout animation do Reanimated deixa o item com `position: absolute` no navegador, o contêiner
 * passa a medir 0 px e os cartões se sobrepõem quando um deles muda de altura. CSS não mexe no
 * fluxo e "reduzir movimento" é tratado em `src/global.css`.
 */

const ENTRADA = {
  from: { opacity: 0, transform: [{ translateY: Deslocamento.lista }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

type EntradaListaProps = {
  indice: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function EntradaLista({ indice, style, children }: EntradaListaProps) {
  const atraso = Math.min(indice, Movimento.escalonamentoMaximo - 1) * Movimento.escalonamento;
  const animacao = {
    animationKeyframes: ENTRADA,
    animationDuration: `${Movimento.entrada}ms`,
    animationDelay: `${atraso}ms`,
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
  } as unknown as ViewStyle;

  return <View style={[style, animacao]}>{children}</View>;
}
