import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  administracaoDeServidor,
  cadastroParaServidor,
  contatoDeServidor,
  eventoDeServidor,
  eventosDeServidor,
  limitesParaServidor,
  pastoraisPublicasDeServidor,
  resumoDeServidor,
  sessaoDeLogin,
} from './adapters.ts';

test('sessaoDeLogin normaliza papéis, pessoas e participações', () => {
  const s = sessaoDeLogin({
    token: 'abc.def',
    responsavelId: 'R003',
    responsavel: 'Pai Tres',
    administrador: true,
    pastoraisCoordenadas: [{ id: 'P002', nome: 'Leitores' }, { nome: 'sem id' }],
    pessoas: [
      {
        id: 'C002',
        nome: 'Beto',
        tipo: 'crianca',
        membros: [
          { pastoralId: 'P001', pastoral: 'Coroinhas', funcaoId: 'F002', funcao: 'Cerimoniário', situacao: 'ativo' },
          { pastoralId: 'P002', pastoral: 'Leitores', funcaoId: 'F003', funcao: 'Leitor', situacao: 'pendente' },
          { pastoral: 'sem ids' },
        ],
      },
      { id: 'C004', nome: 'Leitor Cinco', tipo: 'adulto' },
      { id: '', nome: 'sem id' },
    ],
  });
  assert.equal(s.administrador, true);
  assert.deepEqual(s.pastoraisCoordenadas, [{ id: 'P002', nome: 'Leitores' }]);
  assert.equal(s.pessoas.length, 2, 'pessoa sem id é descartada');
  assert.equal(s.pessoas[0].membros.length, 2, 'participação sem ids é descartada');
  assert.equal(s.pessoas[0].membros[1].situacao, 'pendente');
  assert.equal(s.pessoas[1].tipo, 'adulto');
  assert.deepEqual(s.pessoas[1].membros, []);
});

test('sessaoDeLogin aguenta resposta vazia sem quebrar', () => {
  const s = sessaoDeLogin(undefined);
  assert.equal(s.administrador, false);
  assert.deepEqual(s.pessoas, []);
  assert.deepEqual(s.pastoraisCoordenadas, []);
});

test('eventoDeServidor converte vagas e nomes', () => {
  const e = eventoDeServidor({
    id: 'E001',
    data: '18/10/2026',
    horario: '19:00',
    descricao: null,
    vagas: [
      { funcaoId: 'F001', funcao: 'Coroinha', pastoralId: 'P001', pastoral: 'Coroinhas', minimo: '1', maximo: 3, escalados: ['C001'], nomes: ['Ana'] },
      { funcaoId: 'F002', funcao: 'Cerimoniário', pastoralId: 'P001', pastoral: 'Coroinhas', minimo: 1, maximo: 2 },
      { funcao: 'sem id' },
    ],
  });
  assert.ok(e);
  assert.equal(e.descricao, '');
  assert.equal(e.vagas.length, 2);
  assert.deepEqual(e.vagas[0], {
    funcaoId: 'F001', funcao: 'Coroinha', pastoralId: 'P001', pastoral: 'Coroinhas',
    minimo: 1, maximo: 3, escalados: ['C001'], nomes: ['Ana'],
  });
  assert.deepEqual(e.vagas[1].escalados, []);
  assert.ok(!('nomes' in e.vagas[1]));
  assert.equal(eventoDeServidor({ data: 'sem id' }), null);
  assert.deepEqual(eventosDeServidor('lixo'), []);
});

test('resumoDeServidor monta o resumo da pastoral', () => {
  const r = resumoDeServidor({
    pastoral: { id: 'P001', nome: 'Coroinhas' },
    missasAbaixoDoMinimo: 2,
    vagasAbertas7dias: 5,
    taxaOcupacao: 40,
    totalMembros: 6,
    pendentes: 1,
    proximo: {
      data: '18/10/2026', horario: '19:00', diaSemana: 'domingo', descricao: 'Missa',
      vagas: [{ funcaoId: 'F001', funcao: 'Coroinha', ocupadas: 1, minimo: 3, maximo: 6 }],
    },
    alertas: [
      { eventoId: 'E001', data: '18/10/2026', horario: '19:00', diaSemana: 'domingo', ocupacaoPct: 25,
        vagas: [{ funcaoId: 'F001', funcao: 'Coroinha', ocupadas: 1, maximo: 6 }] },
      { data: 'sem id' },
    ],
  });
  assert.equal(r.pastoral.nome, 'Coroinhas');
  assert.equal(r.pendentes, 1);
  assert.equal(r.proximo?.vagas[0].maximo, 6);
  assert.equal(r.alertas.length, 1);
  assert.equal(resumoDeServidor({}).proximo, null);
});

test('contatoDeServidor só aceita link do WhatsApp', () => {
  const ok = contatoDeServidor({ pessoaNome: 'Ana', responsavelNome: 'Mae', link: 'https://api.whatsapp.com/send/?phone=5511' });
  assert.ok(ok?.link);
  assert.equal(ok?.semCelular, false);
  const mau = contatoDeServidor({ pessoaNome: 'Ana', responsavelNome: 'Mae', link: 'javascript:alert(1)' });
  assert.equal(mau?.link, null);
  assert.equal(mau?.semCelular, true);
  assert.equal(contatoDeServidor({ pessoaNome: 'Ana', semCelular: true })?.semCelular, true);
});

test('administracaoDeServidor e pastorais públicas', () => {
  const a = administracaoDeServidor({
    pastorais: [{ id: 'P001', nome: 'Coroinhas', ativa: false, coordenadorId: 'R001', coordenador: 'Coord', funcoes: [{ id: 'F001', nome: 'Coroinha', minimo: 3, maximo: 6 }] }],
    usuarios: [{ id: 'R001', nome: 'Coord' }, {}],
    missas: [{ id: 'E001', data: '18/10/2026', horario: '19:00', pastorais: [{ pastoralId: 'P001', pastoral: 'Coroinhas', escalados: 2, maximo: 9 }] }],
  });
  assert.equal(a.pastorais[0].ativa, false);
  assert.equal(a.usuarios.length, 1);
  assert.equal(a.missas[0].pastorais[0].escalados, 2);

  const p = pastoraisPublicasDeServidor([{ id: 'P001', nome: 'Coroinhas', funcoes: [{ id: 'F001', nome: 'Coroinha' }, {}] }, {}]);
  assert.equal(p.length, 1);
  assert.deepEqual(p[0].funcoes, [{ id: 'F001', nome: 'Coroinha' }]);
});

test('o que vai para o servidor leva só os campos esperados', () => {
  assert.deepEqual(
    limitesParaServidor([{ funcaoId: 'F001', funcao: 'Coroinha', minimo: 1, maximo: 3 }]),
    [{ funcaoId: 'F001', minimo: 1, maximo: 3 }],
  );
  const c = cadastroParaServidor({
    nome: 'Joana Lima', email: 'j@x.com', celular: '', senha: 'abcdef',
    euSirvo: { pastoralId: 'P002', funcaoId: 'F003' },
    filhos: [{ nome: 'Davi', pastoralId: 'P001', funcaoId: 'F001' }],
  });
  assert.deepEqual(c.euSirvo, { pastoralId: 'P002', funcaoId: 'F003' });
  assert.deepEqual(c.filhos, [{ nome: 'Davi', pastoralId: 'P001', funcaoId: 'F001' }]);
  assert.equal(cadastroParaServidor({ nome: 'A B', email: 'a@b.c', celular: '', senha: 'x', euSirvo: null, filhos: [] }).euSirvo, null);
});
