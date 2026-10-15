import type { DiaSemana } from '@/types';

export const DIAS_DA_SEMANA: { valor: DiaSemana; rotulo: string }[] = [
  { valor: 'domingo', rotulo: 'Domingo' },
  { valor: 'segunda', rotulo: 'Segunda' },
  { valor: 'terca', rotulo: 'Terça' },
  { valor: 'quarta', rotulo: 'Quarta' },
  { valor: 'quinta', rotulo: 'Quinta' },
  { valor: 'sexta', rotulo: 'Sexta' },
  { valor: 'sabado', rotulo: 'Sábado' },
];

function pluralDaPalavra(p: string): string {
  if (/[sx]$/i.test(p)) return p;
  if (/ão$/i.test(p)) return p.replace(/ão$/i, 'ões');
  if (/[lrz]$/i.test(p)) return p + 'es';
  return p + 's';
}

/**
 * "Coroinha" -> "Coroinhas", "Leitor" -> "Leitores", "Ministro da Comunhão" -> "Ministros da Comunhão".
 * Plural simples, só da primeira palavra: serve para títulos de seção.
 */
export function plural(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (!partes[0]) return nome;
  partes[0] = pluralDaPalavra(partes[0]);
  return partes.join(' ');
}
