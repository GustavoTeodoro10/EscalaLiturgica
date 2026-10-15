/**
 * Créditos do desenvolvedor, exibidos no rodapé de todas as telas.
 *
 * O endereço do site vem de `EXPO_PUBLIC_TEOCODE_URL` (.env e variáveis da Vercel). Sem ele, o
 * rodapé aparece como texto simples, sem link, para nunca apontar para um endereço errado.
 */
export const TEOCODE = {
  nome: 'TeoCode',
  ano: 2026,
  site: (process.env.EXPO_PUBLIC_TEOCODE_URL ?? '').trim(),
} as const;
