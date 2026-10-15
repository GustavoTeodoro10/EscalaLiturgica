import { FadeIn, FadeOut, Keyframe, ReduceMotion } from 'react-native-reanimated';

import { Deslocamento, EaseOutEntrada, Movimento } from '@/constants/movimento';

/**
 * Entradas e saídas prontas (layout animations do Reanimated). Construídas uma vez, fora dos
 * componentes, e todas obedecem a "reduzir movimento" do sistema.
 *
 * NÃO usar `layout={LinearTransition}` (animação de layout) em listas na web: o Reanimated posiciona os
 * elementos de forma absoluta durante a transição, a coluna pai passa a medir 0 px e a lista deixa
 * de rolar. Altura que muda = troca com fade, sem deslizar o resto.
 *
 * NÃO usar `entering` com Keyframe em itens de lista na web pelo mesmo motivo (o item fica com
 * `position: absolute` e os cartões se sobrepõem quando um cresce). Para itens de lista use o
 * componente `EntradaLista` (`src/components/entrada-lista.tsx`; na web é CSS puro). Aqui ficam
 * só entradas de elementos pontuais, e só com fade (`FadeIn`): avisos, mensagens de campo, troca de aba.
 * Entrada com `Keyframe` (deslocamento) tira o elemento do fluxo durante a animação e ele cobre o que está abaixo.
 */

/** Saída mais curta que a entrada: o sistema responde rápido ao tirar algo da frente. */
export const SAI = FadeOut.duration(Movimento.saida).reduceMotion(ReduceMotion.System);

/** Algo aparece sem mover: estado vazio, mensagem de campo, conteúdo de uma aba. */
export const ENTRA_FADE = FadeIn.duration(Movimento.entrada)
  .easing(EaseOutEntrada)
  .reduceMotion(ReduceMotion.System);

/** Troca de aba ou de dia: mais curta, porque acontece dezenas de vezes. */
export const ENTRA_TROCA = FadeIn.duration(Movimento.troca)
  .easing(EaseOutEntrada)
  .reduceMotion(ReduceMotion.System);

const ENTRADAS_DE_LISTA = Array.from({ length: Movimento.escalonamentoMaximo }, (_, i) =>
  new Keyframe({
    from: { opacity: 0, transform: [{ translateY: Deslocamento.lista }] },
    to: { opacity: 1, transform: [{ translateY: 0 }] },
  })
    .duration(Movimento.entrada)
    .delay(i * Movimento.escalonamento)
    .reduceMotion(ReduceMotion.System),
);

/**
 * Entrada escalonada da primeira lista. Do 7º item em diante entram juntos com o 6º:
 * escalonar demais deixa a tela lenta para quem só quer achar a data.
 */
export function entradaDeLista(indice: number) {
  return ENTRADAS_DE_LISTA[Math.min(indice, Movimento.escalonamentoMaximo - 1)];
}
