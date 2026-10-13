const DIAS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** "21/10/2026" -> "quarta-feira". Devolve '' se o texto não for uma data dd/MM/yyyy válida. */
export function diaDaSemana(dataBr: string): string {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBr);
  if (!partes) return '';
  const [, dia, mes, ano] = partes;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  // new Date "corrige" datas impossíveis (31/02 vira março): rejeitamos
  if (data.getDate() !== Number(dia) || data.getMonth() !== Number(mes) - 1) return '';
  return DIAS[data.getDay()];
}

/** Primeira letra maiúscula, para começo de frase. */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
