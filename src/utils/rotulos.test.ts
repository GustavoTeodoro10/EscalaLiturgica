import assert from 'node:assert/strict';
import { test } from 'node:test';

import { plural } from './rotulos.ts';

test('plural simples dos nomes de função', () => {
  assert.equal(plural('Coroinha'), 'Coroinhas');
  assert.equal(plural('Cerimoniário'), 'Cerimoniários');
  assert.equal(plural('Leitor'), 'Leitores');
  assert.equal(plural('Ministro da Comunhão'), 'Ministros da Comunhão');
  assert.equal(plural('Sacristão'), 'Sacristões');
  assert.equal(plural('Músicos'), 'Músicos');
  assert.equal(plural(''), '');
});
