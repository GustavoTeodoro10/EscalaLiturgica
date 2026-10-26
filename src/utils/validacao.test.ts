// Rodar com:  node --test src/utils/validacao.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dataBrParaIso,
  emailValido,
  horarioValido,
  inteiroLimitado,
  mascaraData,
  nascimentoParaIso,
  normalizarHorario,
  somenteDigitos,
  tokenRedefinicaoValido,
} from './validacao.ts';

test('emailValido', () => {
  assert.equal(emailValido('mae@exemplo.com'), true);
  assert.equal(emailValido('  mae@exemplo.com '), true);
  assert.equal(emailValido('mae@exemplo'), false);
  assert.equal(emailValido('mae exemplo@x.com'), false);
  assert.equal(emailValido(''), false);
});

test('horarioValido exige HH:mm', () => {
  assert.equal(horarioValido('19:00'), true);
  assert.equal(horarioValido('23:59'), true);
  assert.equal(horarioValido('24:00'), false);
  assert.equal(horarioValido('9:30'), false);
  assert.equal(horarioValido('19:60'), false);
});

test('normalizarHorario entende formas comuns de digitar', () => {
  assert.equal(normalizarHorario('19'), '19:00');
  assert.equal(normalizarHorario('9'), '09:00');
  assert.equal(normalizarHorario('930'), '09:30');
  assert.equal(normalizarHorario('1900'), '19:00');
  assert.equal(normalizarHorario('9:30'), '09:30');
  assert.equal(normalizarHorario('19h30'), '19:30');
  assert.equal(normalizarHorario(' 8:5 '), '08:05');
});

test('normalizarHorario recusa o que não é horário', () => {
  assert.equal(normalizarHorario(''), null);
  assert.equal(normalizarHorario('25'), null);
  assert.equal(normalizarHorario('12:99'), null);
  assert.equal(normalizarHorario('abc'), null);
  assert.equal(normalizarHorario('1:2:3'), null);
  assert.equal(normalizarHorario('12345'), null);
});

test('inteiroLimitado', () => {
  assert.equal(inteiroLimitado('4'), 4);
  assert.equal(inteiroLimitado(' 12 '), 12);
  assert.equal(inteiroLimitado('0'), 0);
  assert.equal(inteiroLimitado('51'), null);
  assert.equal(inteiroLimitado('-1'), null);
  assert.equal(inteiroLimitado('3.5'), null);
  assert.equal(inteiroLimitado(''), null);
  assert.equal(inteiroLimitado('100', 200), 100);
});

test('somenteDigitos', () => {
  assert.equal(somenteDigitos('a1b2-3'), '123');
});

test('tokenRedefinicaoValido', () => {
  assert.equal(tokenRedefinicaoValido('a'.repeat(32)), true);
  assert.equal(tokenRedefinicaoValido('A'.repeat(32)), false);
  assert.equal(tokenRedefinicaoValido('abc'), false);
  assert.equal(tokenRedefinicaoValido(''), false);
});

test('dataBrParaIso aceita dd/mm/aaaa e recusa datas que não existem', () => {
  assert.equal(dataBrParaIso('25/12/2026'), '2026-12-25');
  assert.equal(dataBrParaIso('5/1/26'), '2026-01-05');
  assert.equal(dataBrParaIso(' 05.01.2027 '), '2027-01-05');
  assert.equal(dataBrParaIso('31/02/2026'), null);
  assert.equal(dataBrParaIso('2026-12-25'), null);
  assert.equal(dataBrParaIso('abc'), null);
  assert.equal(dataBrParaIso(''), null);
});

test('mascaraData coloca as barras enquanto digita', () => {
  assert.equal(mascaraData('1'), '1');
  assert.equal(mascaraData('150'), '15/0');
  assert.equal(mascaraData('15031985'), '15/03/1985');
  assert.equal(mascaraData('15/03/1985999'), '15/03/1985');
  assert.equal(mascaraData('ab'), '');
});

test('nascimentoParaIso valida data, futuro, idade mínima e ano de 4 dígitos', () => {
  const hoje = new Date(2026, 9, 26); // 26/10/2026
  assert.deepEqual(nascimentoParaIso('15/03/1985', 18, hoje), { iso: '1985-03-15' });
  assert.deepEqual(nascimentoParaIso('5/1/2016', 0, hoje), { iso: '2016-01-05' });
  assert.ok('erro' in nascimentoParaIso('', 0, hoje));
  assert.ok('erro' in nascimentoParaIso('15/03/85', 0, hoje), 'ano de 2 dígitos é ambíguo');
  assert.ok('erro' in nascimentoParaIso('31/02/2010', 0, hoje), 'data que não existe');
  assert.ok('erro' in nascimentoParaIso('27/10/2026', 0, hoje), 'futuro');
  assert.ok('erro' in nascimentoParaIso('01/01/1900', 0, hoje), 'mais de 110 anos');
  // 18 anos completos só no dia do aniversário
  assert.ok('erro' in nascimentoParaIso('27/10/2008', 18, hoje));
  assert.deepEqual(nascimentoParaIso('26/10/2008', 18, hoje), { iso: '2008-10-26' });
});
