export const SENHA_MINIMA = 6;
export const SENHA_MAXIMA = 100;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;
const REGEX_TOKEN_RESET = /^[a-f0-9]{32}$/;

export function emailValido(valor: string): boolean {
  return REGEX_EMAIL.test(valor.trim());
}

export function horarioValido(valor: string): boolean {
  return REGEX_HORARIO.test(valor);
}

export function tokenRedefinicaoValido(valor: string): boolean {
  return REGEX_TOKEN_RESET.test(valor);
}

/**
 * Aceita o que a pessoa costuma digitar e devolve "HH:mm", ou null se não der para entender.
 * "19" -> "19:00", "930" -> "09:30", "1900" -> "19:00", "9:30" -> "09:30".
 */
export function normalizarHorario(valor: string): string | null {
  const limpo = valor.trim().replace(/h/i, ':').replace(/\s+/g, '');
  let horas: string;
  let minutos: string;

  if (limpo.includes(':')) {
    const [h, m = '00', resto] = limpo.split(':');
    if (resto !== undefined) return null;
    horas = h;
    minutos = m === '' ? '00' : m;
  } else if (/^\d{1,2}$/.test(limpo)) {
    horas = limpo;
    minutos = '00';
  } else if (/^\d{3,4}$/.test(limpo)) {
    horas = limpo.slice(0, -2);
    minutos = limpo.slice(-2);
  } else {
    return null;
  }

  if (!/^\d{1,2}$/.test(horas) || !/^\d{1,2}$/.test(minutos)) return null;
  const resultado = `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;
  return horarioValido(resultado) ? resultado : null;
}

/** Inteiro de 0 a `maximo` a partir do que foi digitado; null se vazio ou inválido. */
export function inteiroLimitado(valor: string, maximo = 50): number | null {
  if (!/^\d+$/.test(valor.trim())) return null;
  const n = Number(valor.trim());
  return n >= 0 && n <= maximo ? n : null;
}

/** Só dígitos (para campos numéricos). */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Vai colocando as barras enquanto a pessoa digita só números: "15031985" -> "15/03/1985". */
export function mascaraData(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export type ResultadoNascimento = { iso: string } | { erro: string };

/**
 * Data de nascimento digitada como "dd/mm/aaaa" (ano com 4 dígitos) -> "AAAA-MM-DD".
 * `idadeMinima` recusa quem é mais novo (ex.: 18 para o responsável). `hoje` existe para os testes.
 */
export function nascimentoParaIso(valor: string, idadeMinima = 0, hoje = new Date()): ResultadoNascimento {
  const texto = valor.trim();
  if (!texto) return { erro: 'Informe a data de nascimento.' };
  if (!/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}$/.test(texto)) return { erro: 'Use dia/mês/ano, por exemplo 15/03/1985.' };
  const iso = dataBrParaIso(texto);
  if (!iso) return { erro: 'Essa data não existe. Confira dia, mês e ano.' };

  const [ano, mes, dia] = iso.split('-').map(Number);
  const nasc = new Date(ano, mes - 1, dia);
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (nasc > inicioHoje) return { erro: 'A data de nascimento não pode ser no futuro.' };

  let idade = inicioHoje.getFullYear() - ano;
  if (inicioHoje.getMonth() < mes - 1 || (inicioHoje.getMonth() === mes - 1 && inicioHoje.getDate() < dia)) idade -= 1;
  if (idade > 110) return { erro: 'Confira o ano de nascimento.' };
  if (idade < idadeMinima) return { erro: `O cadastro é do responsável, que precisa ter ${idadeMinima} anos ou mais.` };
  return { iso };
}

/**
 * "dd/mm/aaaa" (ou "d/m/aa") digitado pela pessoa -> "yyyy-MM-dd", ou null se não for uma data real.
 * Ano com dois dígitos vira 20xx.
 */
export function dataBrParaIso(valor: string): string | null {
  const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(valor.trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
