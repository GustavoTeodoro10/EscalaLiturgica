// Rodar com:  node --test src/utils/calendario.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { celulasDoMes, chaveData, paraData, partesDaData, somarMeses } from './calendario.ts';

test('chaveData e paraData são inversas', () => {
  assert.equal(chaveData(new Date(2026, 9, 5)), '05/10/2026');
  const d = paraData('05/10/2026');
  assert.ok(d);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 5);
});

test('paraData recusa texto inválido e datas impossíveis', () => {
  assert.equal(paraData(''), null);
  assert.equal(paraData('2026-10-05'), null);
  assert.equal(paraData('31/02/2026'), null);
  assert.equal(paraData('5/10/2026'), null);
});

test('celulasDoMes: outubro/2026 começa na quinta e fecha 5 semanas', () => {
  const c = celulasDoMes(2026, 9);
  assert.equal(c.length % 7, 0);
  assert.equal(c.length, 35);
  assert.deepEqual(c.slice(0, 4), [null, null, null, null]);
  assert.equal(c[4], 1);
  assert.equal(c.filter((x) => x !== null).length, 31);
});

test('celulasDoMes: fevereiro bissexto tem 29 dias', () => {
  assert.equal(celulasDoMes(2028, 1).filter((x) => x !== null).length, 29);
  assert.equal(celulasDoMes(2027, 1).filter((x) => x !== null).length, 28);
});

test('somarMeses vira o ano nos dois sentidos', () => {
  assert.deepEqual(somarMeses(2026, 11, 1), { ano: 2027, mes: 0 });
  assert.deepEqual(somarMeses(2026, 0, -1), { ano: 2025, mes: 11 });
  assert.deepEqual(somarMeses(2026, 5, 0), { ano: 2026, mes: 5 });
  assert.deepEqual(somarMeses(2026, 5, 14), { ano: 2027, mes: 7 });
});

test('partesDaData monta o bloco de data', () => {
  assert.deepEqual(partesDaData('15/10/2026'), {
    dia: 15,
    mes: 'out',
    diaSemana: 'qui',
    porExtenso: 'quinta-feira, 15 de outubro',
  });
  assert.equal(partesDaData('01/03/2027')?.mes, 'mar');
});

test('partesDaData recusa texto inválido', () => {
  assert.equal(partesDaData(''), null);
  assert.equal(partesDaData('31/02/2026'), null);
});
