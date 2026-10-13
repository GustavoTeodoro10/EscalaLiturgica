// Rodar com:  node --test src/utils/format-date.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { capitalizar, diaDaSemana } from './format-date.ts';

test('diaDaSemana devolve o dia em português', () => {
  assert.equal(diaDaSemana('11/10/2026'), 'domingo');
  assert.equal(diaDaSemana('14/10/2026'), 'quarta-feira');
  assert.equal(diaDaSemana('01/01/2000'), 'sábado');
});

test('diaDaSemana recusa texto inválido e datas impossíveis', () => {
  assert.equal(diaDaSemana(''), '');
  assert.equal(diaDaSemana('2026-10-11'), '');
  assert.equal(diaDaSemana('31/02/2026'), '');
});

test('capitalizar', () => {
  assert.equal(capitalizar('domingo'), 'Domingo');
  assert.equal(capitalizar(''), '');
});
