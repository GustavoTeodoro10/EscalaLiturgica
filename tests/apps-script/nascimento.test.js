/**
 * Cadastro com data de nascimento e pastorais que exigem responsável (ex.: coroinhas).
 * Cenário e usuários: ver o cabeçalho de security.test.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { novoAmbiente, plain } = require('./harness');

const NASC_ADULTO = '1985-03-15';
const NASC_FILHO = '2015-01-05';

const ymd = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('cadastro: data de nascimento do responsável e dos filhos é obrigatória e conferida', () => {
  const { ctx, abas } = novoAmbiente();
  const antes = abas.Responsaveis.length;
  const base = { nome: 'Maria Silva', email: 'm@x.com', senha: 'abcdef', nascimento: NASC_ADULTO };
  const filho = (extra) => ({ nome: 'Bia', nascimento: NASC_FILHO, pastoralId: 'P001', funcaoId: 'F001', ...extra });
  const ruim = (extra) => plain(ctx.cadastrarResponsavel({ ...base, filhos: [filho()], ...extra }));

  const semNasc = ruim({ nascimento: '' });
  assert.equal(semNasc.sucesso, false);
  assert.match(semNasc.mensagem, /data de nascimento/);
  assert.equal(ruim({ nascimento: '15/03/1985' }).sucesso, false, 'o servidor só aceita AAAA-MM-DD');
  assert.equal(ruim({ nascimento: '1985-02-31' }).sucesso, false, 'dia que não existe');
  assert.equal(ruim({ nascimento: ymd(5) }).sucesso, false, 'no futuro');
  assert.equal(ruim({ nascimento: '1850-01-01' }).sucesso, false, 'velho demais');
  const menor = ruim({ nascimento: '2015-06-01' });
  assert.equal(menor.sucesso, false);
  assert.match(menor.mensagem, /18 anos/);

  assert.equal(ruim({ filhos: [filho({ nascimento: '' })] }).sucesso, false, 'filho sem nascimento');
  assert.match(ruim({ filhos: [filho({ nascimento: undefined })] }).mensagem, /Bia/);
  assert.equal(ruim({ filhos: [filho({ nascimento: ymd(1) })] }).sucesso, false, 'filho no futuro');
  assert.equal(abas.Responsaveis.length, antes, 'nenhum cadastro inválido pode ter sido gravado');

  assert.equal(ruim({}).sucesso, true);
});

test('cadastro: o adulto serve em várias pastorais e o mesmo filho em duas vira uma pessoa só', () => {
  const { ctx, abas } = novoAmbiente();
  const r = plain(ctx.cadastrarResponsavel({
    nome: 'Joana Lima', email: 'joana@x.com', senha: 'abcdef', nascimento: NASC_ADULTO,
    euSirvo: [
      { pastoralId: 'P002', funcaoId: 'F003' },
      { pastoralId: 'P001', funcaoId: 'F002' },
      { pastoralId: 'P002', funcaoId: 'F003' },
    ],
    filhos: [
      { nome: 'Davi', nascimento: NASC_FILHO, pastoralId: 'P001', funcaoId: 'F001' },
      { nome: 'davi', nascimento: NASC_FILHO, pastoralId: 'P002', funcaoId: 'F003' },
      { nome: 'Davi', nascimento: '2013-02-02', pastoralId: 'P001', funcaoId: 'F001' },
    ],
  }));
  assert.equal(r.sucesso, true);
  const eu = r.pessoas.find((p) => p.tipo === 'adulto');
  assert.deepEqual(eu.membros.map((m) => m.funcaoId).sort(), ['F002', 'F003'], 'sem função repetida');
  const davis = r.pessoas.filter((p) => p.tipo === 'crianca');
  assert.equal(davis.length, 2, 'mesmo nome com nascimentos diferentes são pessoas diferentes');
  assert.deepEqual(davis.map((d) => d.membros.length).sort(), [1, 2]);
  assert.equal(abas.Criancas.filter((c) => /^davi$/i.test(c[1])).length, 2);
});

test('cadastro: aceita a forma antiga (euSirvo como objeto único)', () => {
  const { ctx } = novoAmbiente();
  const r = plain(ctx.cadastrarResponsavel({
    nome: 'Joana Lima', email: 'joana@x.com', senha: 'abcdef', nascimento: NASC_ADULTO,
    euSirvo: { pastoralId: 'P002', funcaoId: 'F003' },
  }));
  assert.equal(r.sucesso, true);
  assert.equal(r.pessoas.length, 1);
});

test('pastoral que exige responsável: a lista pública informa e só o administrador muda', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const lista = plain(ctx.listarPastoraisPublico());
  assert.deepEqual(lista.map((p) => [p.id, p.exigeResponsavel]), [['P001', true], ['P002', false]]);

  const admin = entrar('Admin.Quatro', 'admin44');
  const r = plain(ctx.criarPastoral(admin, {
    nome: 'Acólitos Mirins', coordenadorId: 'R003', exigeResponsavel: true, funcoes: [{ nome: 'Acólito', minimo: 1, maximo: 2 }],
  }));
  assert.equal(r.sucesso, true);
  assert.equal(abas.Pastorais[abas.Pastorais.length - 1][4], true);
  const semFlag = plain(ctx.criarPastoral(admin, {
    nome: 'Música', coordenadorId: 'R003', funcoes: [{ nome: 'Canto', minimo: 1, maximo: 2 }],
  }));
  assert.equal(semFlag.sucesso, true);
  assert.equal(abas.Pastorais[abas.Pastorais.length - 1][4], false, 'sem informar, é só de adultos');

  assert.equal(plain(ctx.editarPastoral(admin, 'P002', { exigeResponsavel: true })).sucesso, true);
  assert.equal(plain(ctx.listarPastoraisPublico()).find((p) => p.id === 'P002').exigeResponsavel, true);
  assert.equal(plain(ctx.obterAdministracao(admin)).pastorais.find((p) => p.id === 'P002').exigeResponsavel, true);
  assert.equal(plain(ctx.editarPastoral(admin, 'P002', { nome: 'Leitores' })).sucesso, true);
  assert.equal(abas.Pastorais[2][4], true, 'editar outro campo não zera o indicador');

  const coord = entrar('Leitor.Cinco', 'leitor55'); // coordena, mas não administra
  assert.throws(() => ctx.editarPastoral(coord, 'P002', { exigeResponsavel: false }), /SEM_PERMISSAO/);
});

test('migração: pastoral de coroinhas já existente passa a exigir responsável, sem sobrescrever o que o administrador definiu', () => {
  const a = novoAmbiente();
  // planilha como estava antes desta mudança: Pastorais com 4 colunas
  a.abas.Pastorais.forEach((linha) => { linha.length = 4; });
  a.abas.Pastorais.push(['P009', 'Coroinhas Mirins', 'R001', true, false]); // marcado "não" de propósito

  const r = a.migrarParaMultiPastoral();
  assert.equal(r.jaMigrado, true);
  assert.equal(a.abas.Pastorais[0][4], 'ExigeResponsavel');
  assert.equal(a.abas.Pastorais[1][4], true, 'célula vazia em pastoral de coroinhas vira "sim"');
  assert.equal(a.abas.Pastorais[2][4], undefined, 'Leitores continua sem marca (só adultos)');
  assert.equal(a.abas.Pastorais[3][4], false, 'valor explícito é respeitado');
  assert.equal(a.abas.Responsaveis[0][8], 'Nascimento');
  assert.equal(a.abas.Criancas[0][4], 'Nascimento');

  const antes = JSON.stringify(a.abas.Pastorais);
  a.migrarParaMultiPastoral();
  assert.equal(JSON.stringify(a.abas.Pastorais), antes, 'segunda execução não muda nada');
});

test('coordenação vê a idade, não a data de nascimento', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  abas.Criancas.find((c) => c[0] === 'C001')[4] = '2015-01-05';
  abas.Criancas.find((c) => c[0] === 'C003')[4] = new Date(2012, 11, 31); // a planilha pode converter o texto em data
  const coord = entrar('Coord.Um', 'coord123');
  const lista = plain(ctx.listarMembros(coord, 'P001'));
  const idade = (nome) => lista.find((m) => m.nome === nome).idade;

  const hoje = new Date();
  const esperada = (ano, mes, dia) =>
    hoje.getFullYear() - ano - (hoje < new Date(hoje.getFullYear(), mes - 1, dia) ? 1 : 0);
  assert.equal(idade('Ana'), esperada(2015, 1, 5));
  assert.equal(idade('Caio'), esperada(2012, 12, 31));
  assert.equal(idade('Beto'), null, 'cadastro antigo, sem data');
  assert.ok(!JSON.stringify(lista).includes('2015-01-05'), 'a data em si não sai');
});

test('o administrador continua sem ver pessoas, nem a idade', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  abas.Criancas.find((c) => c[0] === 'C001')[4] = '2015-01-05';
  const admin = entrar('Admin.Quatro', 'admin44');
  const texto = JSON.stringify(plain(ctx.obterAdministracao(admin)));
  assert.ok(!texto.includes('2015') && !texto.includes('idade'));
});
