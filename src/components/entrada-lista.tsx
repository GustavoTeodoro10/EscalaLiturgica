import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { entradaDeLista } from '@/constants/entradas';

/**
 * Entrada escalonada de um item da primeira lista (iOS e Android).
 * Na web existe `entrada-lista.web.tsx`, em CSS puro, porque a layout animation do Reanimated
 * tira o item do fluxo no navegador.
 */

type EntradaListaProps = {
  indice: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function EntradaLista({ indice, style, children }: EntradaListaProps) {
  return (
    <Animated.View style={style} entering={entradaDeLista(indice)}>
      {children}
    </Animated.View>
  );
}
