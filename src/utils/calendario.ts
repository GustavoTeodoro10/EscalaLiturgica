export const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export const LETRAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

const p2 = (n: number) => String(n).padStart(2, '0');

/** Date -> "dd/MM/yyyy" (o mesmo formato que o servidor usa nas missas). */
export function chaveData(d: Date): string {
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "dd/MM/yyyy" -> Date (meia-noite local). null se o texto não for uma data válida. */
export function paraData(dataBr: string): Date | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBr);
  if (!partes) return null;
  const dia = Number(partes[1]);
  const mes = Number(partes[2]) - 1;
  const ano = Number(partes[3]);
  const data = new Date(ano, mes, dia);
  if (data.getDate() !== dia || data.getMonth() !== mes || data.getFullYear() !== ano) return null;
  return data;
}

/**
 * Células de um mês para desenhar a grade: `null` antes do dia 1 e no fim, para completar semanas
 * (domingo a sábado). `mes` vai de 0 (janeiro) a 11.
 */
export function celulasDoMes(ano: number, mes: number): (number | null)[] {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = Array(primeiroDiaSemana).fill(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);
  return celulas;
}

/** Soma meses a (ano, mes), tratando a virada de ano. */
export function somarMeses(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const total = ano * 12 + mes + delta;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

const MESES_ABREVIADOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;
const DIAS_ABREVIADOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const DIAS_POR_EXTENSO = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

export type PartesDaData = {
  dia: number;
  mes: string; // "out"
  diaSemana: string; // "qui"
  /** "quinta-feira, 15 de outubro", para leitores de tela */
  porExtenso: string;
};

/** Decompõe "dd/MM/yyyy" para o bloco de data. null se o texto não for uma data válida. */
export function partesDaData(dataBr: string): PartesDaData | null {
  const d = paraData(dataBr);
  if (!d) return null;
  return {
    dia: d.getDate(),
    mes: MESES_ABREVIADOS[d.getMonth()],
    diaSemana: DIAS_ABREVIADOS[d.getDay()],
    porExtenso: `${DIAS_POR_EXTENSO[d.getDay()]}, ${d.getDate()} de ${NOMES_MESES[d.getMonth()].toLowerCase()}`,
  };
}
