// Valida o contraste WCAG da paleta de src/constants/theme.ts.
//   node scripts/contraste.mjs
// Sai com código 1 se algum par obrigatório ficar abaixo do mínimo.
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../src/constants/theme.ts', import.meta.url), 'utf8');

// extrai os blocos `light: { ... }` e `dark: { ... }` de Colors
function bloco(nome) {
  const m = new RegExp(`${nome}:\\s*\\{([^}]*)\\}`).exec(fonte);
  if (!m) throw new Error(`bloco ${nome} não encontrado em theme.ts`);
  const cores = {};
  for (const [, chave, valor] of m[1].matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) cores[chave] = valor;
  return cores;
}

function luminancia(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}

function razao(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [primeiro plano, fundo, mínimo, descrição]
const PARES = [
  ['text', 'background', 4.5, 'texto sobre a página'],
  ['text', 'surface', 4.5, 'texto sobre cartão'],
  ['textSecondary', 'background', 4.5, 'texto de apoio sobre a página'],
  ['textSecondary', 'surface', 4.5, 'texto de apoio sobre cartão'],
  ['accent', 'background', 4.5, 'link / texto em acento sobre a página'],
  ['accent', 'surface', 4.5, 'texto em acento sobre cartão'],
  ['onAccent', 'accent', 4.5, 'texto do botão principal'],
  ['text', 'accentSoft', 4.5, 'texto sobre item selecionado'],
  ['accent', 'accentSoft', 4.5, 'acento sobre item selecionado'],
  ['attentionText', 'attentionSoft', 4.5, 'texto de atenção'],
  ['attentionText', 'surface', 4.5, 'texto de atenção sobre cartão'],
  ['danger', 'background', 4.5, 'erro sobre a página'],
  ['danger', 'surface', 4.5, 'erro sobre cartão'],
  ['success', 'surface', 4.5, 'sucesso sobre cartão'],
  ['border', 'background', 3, 'borda de controle (não texto)'],
  ['border', 'surface', 3, 'borda de campo sobre cartão (não texto)'],
  ['accent', 'surface', 3, 'foco / seleção (não texto)'],
];

let falhas = 0;
for (const modo of ['light', 'dark']) {
  const c = bloco(modo);
  console.log(`\n${modo.toUpperCase()}`);
  for (const [fg, bg, minimo, rotulo] of PARES) {
    if (!c[fg] || !c[bg]) {
      console.log(`  ?    ${fg} / ${bg}: token ausente (${rotulo})`);
      falhas++;
      continue;
    }
    const r = razao(c[fg], c[bg]);
    const ok = r >= minimo;
    if (!ok) falhas++;
    console.log(`  ${ok ? 'ok ' : 'FALHA'} ${r.toFixed(2).padStart(5)}  (mín ${minimo})  ${fg} ${c[fg]} sobre ${bg} ${c[bg]}  ${rotulo}`);
  }
  // o erro precisa ser distinguível do acento (não só por contraste com o fundo)
  if (c.danger && c.accent) {
    const d = razao(c.danger, c.accent);
    console.log(`  info ${d.toFixed(2).padStart(5)}  danger x accent (quanto menor, mais parecidos; o erro também usa ícone e texto)`);
  }
}

console.log(falhas === 0 ? '\nTudo dentro do mínimo.' : `\n${falhas} par(es) abaixo do mínimo.`);
process.exit(falhas === 0 ? 0 : 1);
