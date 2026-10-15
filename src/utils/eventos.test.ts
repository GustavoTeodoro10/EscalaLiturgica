import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Evento, Pessoa, Vaga } from '@/types';

import {
  agruparPorData,
  compromissosDe,
  diasComVaga,
  estaEscalado,
  eventosComVagaNoDia,
  faltamParaMinimo,
  funcoesAtivasDe,
  pedidosPendentesDe,
  primeiroDiaComVaga,
  rotuloDaVaga,
  temVaga,
  vagasAbertasPara,
  vagasDaPessoa,
} from './eventos.ts';

function vaga(funcaoId: string, funcao: string, pastoralId: string, pastoral: string, minimo: number, maximo: number, escalados: string[] = []): Vaga {
  return { funcaoId, funcao, pastoralId, pastoral, minimo, maximo, escalados };
}

const COROINHA = (esc: string[] = [], max = 3) => vaga('F001', 'Coroinha', 'P001', 'Coroinhas', 1, max, esc);
const CERIM = (esc: string[] = [], max = 2) => vaga('F002', 'Cerimoniário', 'P001', 'Coroinhas', 1, max, esc);
const LEITOR = (esc: string[] = [], max = 2) => vaga('F003', 'Leitor', 'P002', 'Leitores', 1, max, esc);

const evento = (id: string, data: string, vagas: Vaga[]): Evento => ({ id, data, horario: '19:00', descricao: '', vagas });

const ana: Pessoa = {
  id: 'C001', nome: 'Ana', tipo: 'crianca',
  membros: [{ pastoralId: 'P001', pastoral: 'Coroinhas', funcaoId: 'F001', funcao: 'Coroinha', situacao: 'ativo' }],
};
const duda: Pessoa = {
  id: 'C005', nome: 'Duda', tipo: 'crianca',
  membros: [{ pastoralId: 'P001', pastoral: 'Coroinhas', funcaoId: 'F001', funcao: 'Coroinha', situacao: 'pendente' }],
};
const leitor: Pessoa = {
  id: 'C004', nome: 'Leitor Cinco', tipo: 'adulto',
  membros: [
    { pastoralId: 'P002', pastoral: 'Leitores', funcaoId: 'F003', funcao: 'Leitor', situacao: 'ativo' },
    { pastoralId: 'P001', pastoral: 'Coroinhas', funcaoId: 'F002', funcao: 'Cerimoniário', situacao: 'ativo' },
  ],
};

test('só participação aprovada conta; pedidos pendentes ficam à parte', () => {
  assert.deepEqual(funcoesAtivasDe(ana).map((m) => m.funcaoId), ['F001']);
  assert.deepEqual(funcoesAtivasDe(duda), []);
  assert.deepEqual(pedidosPendentesDe(duda).map((m) => m.funcaoId), ['F001']);
});

test('vagas da pessoa: só das funções em que participa, em qualquer pastoral', () => {
  const e = evento('E1', '18/10/2026', [COROINHA(), CERIM(), LEITOR()]);
  assert.deepEqual(vagasDaPessoa(e, ana).map((v) => v.funcaoId), ['F001']);
  assert.deepEqual(vagasDaPessoa(e, leitor).map((v) => v.funcaoId), ['F002', 'F003']);
  assert.deepEqual(vagasDaPessoa(e, duda), []);
});

test('vagas abertas: função dela, com lugar e ela ainda fora', () => {
  const e = evento('E1', '18/10/2026', [COROINHA(['C001']), CERIM([], 0), LEITOR(['X'], 2)]);
  assert.deepEqual(vagasAbertasPara(e, ana), [], 'já escalada');
  assert.deepEqual(vagasAbertasPara(e, leitor).map((v) => v.funcaoId), ['F003'], 'cerimoniário lotado (máx. 0)');
  assert.equal(temVaga(e, leitor), true);
  assert.equal(temVaga(evento('E2', '19/10/2026', [COROINHA(['A', 'B', 'C'])]), ana), false, 'cheia');
  assert.equal(estaEscalado(e, ana), true);
  assert.equal(estaEscalado(e, leitor), false);
});

test('faltam para o mínimo nunca é negativo', () => {
  assert.equal(faltamParaMinimo(vaga('F', 'X', 'P', 'P', 3, 6, ['a'])), 2);
  assert.equal(faltamParaMinimo(vaga('F', 'X', 'P', 'P', 1, 6, ['a', 'b'])), 0);
});

test('dias com vaga, eventos do dia e primeiro dia', () => {
  const eventos = [
    evento('E1', '15/10/2026', [COROINHA(['A', 'B', 'C'])]), // cheia para Ana
    evento('E2', '16/10/2026', [COROINHA()]),
    evento('E3', '16/10/2026', [COROINHA()]),
    evento('E4', '23/10/2026', [LEITOR()]), // outra pastoral
  ];
  assert.deepEqual([...diasComVaga(eventos, ana)], ['16/10/2026']);
  assert.deepEqual(eventosComVagaNoDia(eventos, ana, '16/10/2026').map((e) => e.id), ['E2', 'E3']);
  assert.equal(primeiroDiaComVaga(eventos, ana), '16/10/2026');
  assert.equal(primeiroDiaComVaga(eventos, duda), null);
  assert.deepEqual([...diasComVaga(eventos, leitor)], ['23/10/2026']);
});

test('compromissos trazem a função em que a pessoa serve e agrupam por data', () => {
  const eventos = [
    evento('E1', '16/10/2026', [COROINHA(['C001']), LEITOR(['C004'])]),
    evento('E2', '16/10/2026', [CERIM(['C004'])]),
    evento('E3', '23/10/2026', [COROINHA(['C001'])]),
  ];
  const c = compromissosDe(eventos, [ana, leitor]);
  assert.deepEqual(c.map((x) => `${x.evento.id}:${x.pessoa.id}:${x.vaga.funcaoId}`), [
    'E1:C001:F001', 'E1:C004:F003', 'E2:C004:F002', 'E3:C001:F001',
  ]);
  const g = agruparPorData(c);
  assert.deepEqual(g.map((x) => [x.data, x.itens.length]), [['16/10/2026', 3], ['23/10/2026', 1]]);
});

test('rótulo da vaga mostra a pastoral só quando há mais de uma', () => {
  const v = LEITOR();
  assert.equal(rotuloDaVaga(v, false), 'Leitor');
  assert.equal(rotuloDaVaga(v, true), 'Leitor · Leitores');
});
