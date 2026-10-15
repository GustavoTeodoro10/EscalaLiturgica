/**
 * Multi-pastoral: migração, perfis (administrador, coordenador, responsável) e isolamento entre pastorais.
 * Cenário e usuários: ver o cabeçalho de security.test.js.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { novoAmbiente, plain } = require('./harness');

const ymd = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ids = (lista) => lista.map((x) => x.id);

/* ---------- migração ---------- */

test('migração: cria a pastoral de Coroinhas, converte membros, missas e escalas, e é idempotente', () => {
  const a = novoAmbiente({ migrar: false });
  a.abas.Missas[1][5] = 'C001'; // Ana escalada como Coroinha
  a.abas.Missas[1][8] = 'C002'; // Beto escalado como Cerimoniário

  const r = a.migrarParaMultiPastoral();
  assert.equal(r.sucesso, true);
  assert.equal(r.jaMigrado, false);

  assert.deepEqual(plain(a.abas.Pastorais[1]), ['P001', 'Coroinhas e Cerimoniários', 'R001', true]);
  assert.deepEqual(plain(a.abas.Funcoes.slice(1).map((f) => f[2])), ['Coroinha', 'Cerimoniário']);
  assert.equal(a.abas.Membros.length, 4); // cabeçalho + Ana, Beto, Caio
  assert.ok(a.abas.Membros.slice(1).every((m) => m[3] === 'ativo'));
  assert.equal(a.abas.Responsaveis[1][7], true, 'ex-coordenador vira administrador');
  assert.equal(a.abas.Responsaveis[2][7], undefined, 'pais não viram administradores');
  assert.equal(a.abas.Criancas[1][3], 'crianca');

  assert.equal(a.abas.Eventos.length, 2);
  const vagas = a.abas.Vagas.slice(1);
  assert.deepEqual(plain(vagas.find((v) => v[1] === 'F001').slice(2)), [1, 3, 'C001']);
  assert.deepEqual(plain(vagas.find((v) => v[1] === 'F002').slice(2)), [1, 2, 'C002']);

  // abas antigas intactas
  assert.equal(a.abas.Missas.length, 2);
  assert.equal(a.abas.Missas[1][5], 'C001');

  // rodar de novo não duplica nada
  const antes = JSON.stringify([a.abas.Pastorais, a.abas.Funcoes, a.abas.Membros, a.abas.Eventos, a.abas.Vagas]);
  assert.equal(a.migrarParaMultiPastoral().jaMigrado, true);
  assert.equal(JSON.stringify([a.abas.Pastorais, a.abas.Funcoes, a.abas.Membros, a.abas.Eventos, a.abas.Vagas]), antes);
});

/* ---------- cadastro e entrada em pastoral ---------- */

test('cadastro: adulto e filho entram como pendentes e o coordenador é avisado', () => {
  const { ctx, abas, emails } = novoAmbiente();
  const r = plain(ctx.cadastrarResponsavel({
    nome: 'Joana Lima', email: 'joana@x.com', celular: '(11) 98888-7777', senha: 'abcdef',
    euSirvo: { pastoralId: 'P002', funcaoId: 'F003' },
    filhos: [{ nome: 'Davi', pastoralId: 'P001', funcaoId: 'F001' }],
  }));
  assert.equal(r.sucesso, true);
  assert.equal(r.administrador, false);
  assert.deepEqual(r.pastoraisCoordenadas, []);
  assert.equal(r.pessoas.length, 2);
  const eu = r.pessoas.find((p) => p.tipo === 'adulto');
  assert.equal(eu.nome, 'Joana Lima');
  assert.deepEqual(eu.membros.map((m) => [m.pastoralId, m.funcaoId, m.situacao]), [['P002', 'F003', 'pendente']]);
  assert.equal(r.pessoas.find((p) => p.tipo === 'crianca').membros[0].situacao, 'pendente');

  const nova = abas.Responsaveis[abas.Responsaveis.length - 1];
  assert.match(nova[3], /^h1\$/);
  assert.equal(nova[6], false);
  assert.equal(nova[7], false, 'cadastro nunca vira administrador');

  // e-mail de boas-vindas + um aviso para cada coordenador (P001 e P002)
  const para = emails.map((e) => e.to).sort();
  assert.deepEqual(para, ['coord@x.com', 'joana@x.com', 'leitor5@x.com']);
});

test('cadastro: pessoa pendente ainda não pode ser escalada', () => {
  const { ctx } = novoAmbiente();
  const r = plain(ctx.cadastrarResponsavel({
    nome: 'Joana Lima', email: 'joana@x.com', senha: 'abcdef',
    filhos: [{ nome: 'Davi', pastoralId: 'P001', funcaoId: 'F001' }],
  }));
  const davi = r.pessoas[0];
  const res = plain(ctx.inscrever(r.token, 'E001', davi.id, 'F001'));
  assert.equal(res.sucesso, false);
  assert.match(res.mensagem, /ainda não faz parte/);
});

test('cadastro: valida pastoral/função, exige alguém para servir e limpa HTML e fórmulas', () => {
  const { ctx, abas } = novoAmbiente();
  const base = { nome: 'Maria Silva', email: 'm@x.com', senha: 'abcdef' };
  const ruim = (extra) => plain(ctx.cadastrarResponsavel({ ...base, ...extra }));

  assert.equal(ruim({}).sucesso, false, 'sem ninguém para servir');
  assert.equal(ruim({ filhos: [{ nome: 'A', pastoralId: 'P001', funcaoId: 'F003' }] }).sucesso, false, 'função de outra pastoral');
  assert.equal(ruim({ filhos: [{ nome: 'A', pastoralId: 'P999', funcaoId: 'F001' }] }).sucesso, false, 'pastoral inexistente');
  assert.equal(ruim({ euSirvo: { pastoralId: 'P001', funcaoId: 'F003' } }).sucesso, false);
  assert.equal(ruim({ senha: '123', filhos: [{ nome: 'A', pastoralId: 'P001', funcaoId: 'F001' }] }).sucesso, false);
  assert.equal(abas.Responsaveis.length, 6, 'nenhum cadastro inválido pode ter sido gravado');

  const ok = ruim({
    nome: '=HYPERLINK("http://x")<b>Maria</b> Silva',
    celular: '+55 (11) 98888-7777',
    filhos: [{ nome: '<img src=x onerror=alert(1)>Joao', pastoralId: 'P001', funcaoId: 'F001' }],
  });
  assert.equal(ok.sucesso, true);
  const nova = abas.Responsaveis[abas.Responsaveis.length - 1];
  assert.ok(!/^[=+\-@]/.test(nova[1]) && !/[<>]/.test(nova[1]));
  assert.ok(!/[<>]/.test(ok.pessoas[0].nome));
});

test('pastorais públicas: só as ativas, com suas funções, sem dados de pessoas', () => {
  const { ctx, abas } = novoAmbiente();
  let lista = plain(ctx.listarPastoraisPublico());
  assert.deepEqual(ids(lista), ['P001', 'P002']);
  assert.deepEqual(lista[0].funcoes.map((f) => f.nome), ['Coroinha', 'Cerimoniário']);
  assert.ok(!JSON.stringify(lista).includes('R005'), 'não expõe o coordenador');

  abas.Pastorais[2][3] = false; // Leitores inativa
  lista = plain(ctx.listarPastoraisPublico());
  assert.deepEqual(ids(lista), ['P001']);
});

test('pedir entrada: só para a própria pessoa, uma vez por função, e fica pendente', () => {
  const { ctx, abas, emails, entrar } = novoAmbiente();
  const pai = entrar('Pai.Tres', 'senha33'); // Caio C003
  assert.throws(() => ctx.solicitarEntrada(pai, 'C001', 'F001'), /SEM_PERMISSAO/); // filha de outra
  assert.equal(plain(ctx.solicitarEntrada(pai, 'C003', 'F001')).sucesso, false, 'já participa');
  assert.equal(plain(ctx.solicitarEntrada(pai, 'C003', 'F999')).sucesso, false, 'função inexistente');

  const r = plain(ctx.solicitarEntrada(pai, 'C003', 'F002')); // Caio quer ser também Cerimoniário
  assert.equal(r.sucesso, true);
  assert.deepEqual(plain(abas.Membros[abas.Membros.length - 1]), ['C003', 'P001', 'F002', 'pendente']);
  assert.equal(emails[emails.length - 1].to, 'coord@x.com');
  assert.equal(plain(ctx.solicitarEntrada(pai, 'C003', 'F002')).sucesso, false, 'pedido repetido');
});

/* ---------- escala ---------- */

test('responsável só escala as próprias pessoas, na função em que participam', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const mae = entrar('Mae.Dois', 'senha22'); // Ana (ativa), Duda (pendente)
  assert.throws(() => ctx.inscrever(mae, 'E001', 'C002', 'F002'), /SEM_PERMISSAO/); // filho de outro
  assert.throws(() => ctx.cancelar(mae, 'E001', 'C003', 'F001'), /SEM_PERMISSAO/);

  assert.equal(plain(ctx.inscrever(mae, 'E001', 'C001', 'F002')).sucesso, false, 'Ana não é cerimoniária');
  assert.equal(plain(ctx.inscrever(mae, 'E001', 'C005', 'F001')).sucesso, false, 'Duda ainda está pendente');
  assert.equal(plain(ctx.inscrever(mae, 'E999', 'C001', 'F001')).sucesso, false, 'missa inexistente');

  assert.equal(plain(ctx.inscrever(mae, 'E001', 'C001', 'F001')).sucesso, true);
  const linha = abas.Vagas.find((v) => v[0] === 'E001' && v[1] === 'F001');
  assert.equal(linha[4], 'C001');
  assert.equal(plain(ctx.inscrever(mae, 'E001', 'C001', 'F001')).sucesso, false, 'já escalada');

  assert.equal(plain(ctx.cancelar(mae, 'E001', 'C001', 'F001')).sucesso, true);
  assert.equal(abas.Vagas.find((v) => v[0] === 'E001' && v[1] === 'F001')[4], '');
});

test('o máximo de vagas da função é respeitado', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  abas.Vagas.push(['E001', 'F001', 1, 1, 'C003']); // máximo 1, já ocupado por Caio
  const mae = entrar('Mae.Dois', 'senha22');
  const r = plain(ctx.inscrever(mae, 'E001', 'C001', 'F001'));
  assert.equal(r.sucesso, false);
  assert.match(r.mensagem, /Não há mais vagas/);
});

test('responsável vê só as vagas das pastorais em que a família participa e nenhum nome', () => {
  const { ctx, entrar } = novoAmbiente();
  const pai = entrar('Pai.Tres', 'senha33');
  const missas = plain(ctx.listarMissas(pai));
  assert.deepEqual([...new Set(missas[0].vagas.map((v) => v.pastoralId))], ['P001']);
  const texto = JSON.stringify(missas);
  assert.ok(!texto.includes('Leitor Cinco') && !texto.includes('Ana'), 'nomes de outros não saem aqui');
  assert.ok(!('linha' in missas[0]), 'número da linha da planilha não é exposto');

  const leitor = entrar('Leitor.Cinco', 'leitor55');
  const dele = plain(ctx.listarMissas(leitor));
  assert.deepEqual([...new Set(dele[0].vagas.map((v) => v.pastoralId))], ['P002']);
});

/* ---------- coordenação ---------- */

test('coordenador só mexe na própria pastoral', () => {
  const { ctx, entrar } = novoAmbiente();
  const coordCoroinhas = entrar('Coord.Um', 'coord123');
  const coordLeitores = entrar('Leitor.Cinco', 'leitor55');

  // cada um enxerga a sua e é barrado na do outro
  assert.equal(plain(ctx.listarMembros(coordCoroinhas, 'P001')).length, 4);
  assert.equal(plain(ctx.listarMembros(coordLeitores, 'P002')).length, 1);
  for (const fn of [
    () => ctx.listarMembros(coordLeitores, 'P001'),
    () => ctx.listarMissasParaCoordenador(coordLeitores, 'P001'),
    () => ctx.obterResumoCoordenador(coordLeitores, 'P001'),
    () => ctx.ajustarVagas(coordLeitores, 'P001', 'E001', [{ funcaoId: 'F001', minimo: 0, maximo: 1 }]),
    () => ctx.obterResponsaveisParaChamar(coordLeitores, 'P001', 'E001', 'F001'),
    () => ctx.enviarLembretesCoordenador(coordLeitores, 'P001'),
    () => ctx.decidirEntrada(coordLeitores, 'P001', { pessoaId: 'C005', funcaoId: 'F001', aprovar: true }),
    () => ctx.removerMembro(coordLeitores, 'P001', { pessoaId: 'C001', funcaoId: 'F001' }),
    () => ctx.listarMembros(coordCoroinhas, 'P002'),
  ]) {
    assert.throws(fn, /SEM_PERMISSAO/);
  }
  // escalar gente de outra pastoral
  assert.throws(() => ctx.inscrever(coordCoroinhas, 'E001', 'C004', 'F003'), /SEM_PERMISSAO/);
  assert.throws(() => ctx.inscrever(coordLeitores, 'E001', 'C001', 'F001'), /SEM_PERMISSAO/);
});

test('coordenador escala e cancela qualquer membro da própria pastoral', () => {
  const { ctx, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  assert.equal(plain(ctx.inscrever(coord, 'E001', 'C003', 'F001')).sucesso, true);
  const missa = plain(ctx.listarMissasParaCoordenador(coord, 'P001'))[0];
  const coroinhas = missa.vagas.find((v) => v.funcaoId === 'F001');
  assert.deepEqual(coroinhas.escalados, ['C003']);
  assert.deepEqual(coroinhas.nomes, ['Caio']);
  assert.ok(missa.vagas.every((v) => v.pastoralId === 'P001'));
  assert.equal(plain(ctx.cancelar(coord, 'E001', 'C003', 'F001')).sucesso, true);
});

test('aprovar e recusar pedidos de entrada', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  const lista = plain(ctx.listarMembros(coord, 'P001'));
  assert.equal(lista[0].situacao, 'pendente', 'pendentes primeiro');
  assert.equal(lista[0].nome, 'Duda');
  assert.equal(lista[0].responsavel, 'Mae Dois');

  assert.equal(plain(ctx.decidirEntrada(coord, 'P001', { pessoaId: 'C005', funcaoId: 'F001', aprovar: true })).sucesso, true);
  assert.equal(abas.Membros.find((m) => m[0] === 'C005')[3], 'ativo');
  // não dá para decidir duas vezes
  assert.equal(plain(ctx.decidirEntrada(coord, 'P001', { pessoaId: 'C005', funcaoId: 'F001', aprovar: false })).sucesso, false);

  // pedido novo e recusado some da planilha
  const pai = entrar('Pai.Tres', 'senha33');
  ctx.solicitarEntrada(pai, 'C003', 'F002');
  assert.equal(plain(ctx.decidirEntrada(coord, 'P001', { pessoaId: 'C003', funcaoId: 'F002', aprovar: false })).sucesso, true);
  assert.ok(!abas.Membros.some((m) => m[0] === 'C003' && m[2] === 'F002'));
});

test('remover membro tira também das escalas', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  ctx.inscrever(coord, 'E001', 'C001', 'F001');
  assert.equal(abas.Vagas.find((v) => v[1] === 'F001')[4], 'C001');

  assert.equal(plain(ctx.removerMembro(coord, 'P001', { pessoaId: 'C001', funcaoId: 'F001' })).sucesso, true);
  assert.equal(abas.Vagas.find((v) => v[1] === 'F001')[4], '');
  assert.ok(!abas.Membros.some((m) => m[0] === 'C001' && m[2] === 'F001'));
});

test('ajustar vagas: só da própria pastoral, com validação', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  assert.equal(plain(ctx.ajustarVagas(coord, 'P001', 'E001', [{ funcaoId: 'F001', minimo: 5, maximo: 2 }])).sucesso, false);
  assert.equal(plain(ctx.ajustarVagas(coord, 'P001', 'E001', [{ funcaoId: 'F003', minimo: 0, maximo: 1 }])).sucesso, false,
    'função de outra pastoral');
  assert.equal(plain(ctx.ajustarVagas(coord, 'P001', 'E999', [{ funcaoId: 'F001', minimo: 1, maximo: 2 }])).sucesso, false);

  ctx.inscrever(coord, 'E001', 'C001', 'F001');
  assert.equal(plain(ctx.ajustarVagas(coord, 'P001', 'E001', [
    { funcaoId: 'F001', minimo: 2, maximo: 4 }, { funcaoId: 'F002', minimo: 0, maximo: 1 },
  ])).sucesso, true);
  const linha = abas.Vagas.find((v) => v[0] === 'E001' && v[1] === 'F001');
  assert.deepEqual(plain(linha.slice(2)), [2, 4, 'C001'], 'escalados preservados');
  const missa = plain(ctx.listarMissasParaCoordenador(coord, 'P001'))[0];
  assert.deepEqual(missa.vagas.map((v) => [v.minimo, v.maximo]), [[2, 4], [0, 1]]);
});

test('resumo da pastoral conta só os dados dela', () => {
  const { ctx, entrar } = novoAmbiente();
  const r = plain(ctx.obterResumoCoordenador(entrar('Coord.Um', 'coord123'), 'P001'));
  assert.deepEqual(r.pastoral, { id: 'P001', nome: 'Coroinhas e Cerimoniários' });
  assert.equal(r.totalMembros, 3);
  assert.equal(r.pendentes, 1);
  assert.equal(r.missasAbaixoDoMinimo, 1);
  assert.deepEqual(r.proximo.vagas.map((v) => v.funcao), ['Coroinha', 'Cerimoniário']);

  const leitores = plain(ctx.obterResumoCoordenador(entrar('Leitor.Cinco', 'leitor55'), 'P002'));
  assert.equal(leitores.totalMembros, 1);
  assert.deepEqual(leitores.proximo.vagas.map((v) => v.funcao), ['Leitor']);
});

test('chamar famílias: só livres da função, com mensagem em português e para adultos', () => {
  const { ctx, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  ctx.inscrever(coord, 'E001', 'C001', 'F001'); // Ana escalada: não é mais "livre"
  const lista = plain(ctx.obterResponsaveisParaChamar(coord, 'P001', 'E001', 'F001'));
  assert.deepEqual(lista.map((c) => c.pessoaNome), ['Caio']);
  const msg = decodeURIComponent(lista[0].link);
  assert.match(msg, /pastoral Coroinhas e Cerimoniários/);
  assert.match(msg, /domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado/);
  assert.ok(!/Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday/.test(msg));

  const leitor = entrar('Leitor.Cinco', 'leitor55');
  const dele = plain(ctx.obterResponsaveisParaChamar(leitor, 'P002', 'E001', 'F003'));
  assert.equal(dele.length, 1);
  assert.match(decodeURIComponent(dele[0].link), /Você pode ajudar\?/);
});

/* ---------- administração ---------- */

test('administrador cria, edita, gera e exclui missas; coordenador comum não', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const admin = entrar('Admin.Quatro', 'admin44');
  const coordLeitores = entrar('Leitor.Cinco', 'leitor55');
  const mae = entrar('Mae.Dois', 'senha22');

  for (const quem of [coordLeitores, mae]) {
    assert.throws(() => ctx.criarMissa(quem, { data: ymd(9), horario: '10:00' }), /SEM_PERMISSAO/);
    assert.throws(() => ctx.gerarMissasRecorrentes(quem, { diaSemana: 'domingo', horario: '10:00', semanas: 2 }), /SEM_PERMISSAO/);
    assert.throws(() => ctx.editarMissa(quem, 'E001', { descricao: 'x' }), /SEM_PERMISSAO/);
    assert.throws(() => ctx.excluirMissa(quem, 'E001', ''), /SEM_PERMISSAO/);
    assert.throws(() => ctx.obterAdministracao(quem), /SEM_PERMISSAO/);
    assert.throws(() => ctx.criarPastoral(quem, { nome: 'X' }), /SEM_PERMISSAO/);
  }

  assert.equal(plain(ctx.criarMissa(admin, { data: '2001-01-01', horario: '10:00' })).sucesso, false, 'data passada');
  assert.equal(plain(ctx.criarMissa(admin, { data: ymd(9), horario: '25:99' })).sucesso, false);
  const criada = plain(ctx.criarMissa(admin, { data: ymd(9), horario: '10:00', descricao: '<b>Festa</b>' }));
  assert.equal(criada.sucesso, true);
  assert.equal(abas.Eventos[abas.Eventos.length - 1][3], 'b Festa /b');
  assert.equal(plain(ctx.criarMissa(admin, { data: ymd(9), horario: '10:00' })).sucesso, false, 'duplicada');

  const g = plain(ctx.gerarMissasRecorrentes(admin, { diaSemana: 'domingo', horario: '08:00', semanas: 3, descricao: 'Dominical' }));
  assert.equal(g.criadas, 3);
  assert.equal(plain(ctx.gerarMissasRecorrentes(admin, { diaSemana: 'domingo', horario: '08:00', semanas: 3 })).ignoradas, 3);

  assert.equal(plain(ctx.editarMissa(admin, criada.id, { horario: '7:30' })).sucesso, false);
  assert.equal(plain(ctx.editarMissa(admin, criada.id, { horario: '07:30', descricao: 'Nova' })).sucesso, true);

  // excluir apaga também as linhas de vaga daquela missa
  const coord = entrar('Coord.Um', 'coord123');
  ctx.inscrever(coord, 'E001', 'C001', 'F001');
  assert.ok(abas.Vagas.some((v) => v[0] === 'E001'));
  assert.equal(plain(ctx.excluirMissa(admin, 'E001', '01/01/2000')).sucesso, false, 'data não confere');
  const e001 = plain(ctx.obterAdministracao(admin)).missas.find((m) => m.id === 'E001');
  assert.equal(plain(ctx.excluirMissa(admin, 'E001', e001.data)).sucesso, true);
  assert.ok(!abas.Vagas.some((v) => v[0] === 'E001'));
  assert.ok(!abas.Eventos.some((e) => e[0] === 'E001'));
});

test('administrador cria pastoral; ela aparece no cadastro e as vagas nascem com o padrão', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const admin = entrar('Admin.Quatro', 'admin44');

  assert.equal(plain(ctx.criarPastoral(admin, { nome: '', coordenadorId: 'R005', funcoes: [{ nome: 'X', minimo: 0, maximo: 1 }] })).sucesso, false);
  assert.equal(plain(ctx.criarPastoral(admin, { nome: 'Música', coordenadorId: 'R999', funcoes: [{ nome: 'X', minimo: 0, maximo: 1 }] })).sucesso, false, 'coordenador inexistente');
  assert.equal(plain(ctx.criarPastoral(admin, { nome: 'Música', coordenadorId: 'R003', funcoes: [] })).sucesso, false, 'sem função');
  assert.equal(plain(ctx.criarPastoral(admin, { nome: 'Música', coordenadorId: 'R003', funcoes: [{ nome: 'Violão', minimo: 3, maximo: 1 }] })).sucesso, false);
  assert.equal(plain(ctx.criarPastoral(admin, { nome: 'leitóres', coordenadorId: 'R003', funcoes: [{ nome: 'Y', minimo: 0, maximo: 1 }] })).sucesso, false, 'acento e caixa não criam duplicata de Leitores');

  const r = plain(ctx.criarPastoral(admin, {
    nome: 'Música', coordenadorId: 'R003', funcoes: [{ nome: 'Violão', minimo: 1, maximo: 2 }, { nome: 'Canto', minimo: 2, maximo: 5 }],
  }));
  assert.equal(r.sucesso, true);
  assert.equal(plain(ctx.criarPastoral(admin, { nome: 'MÚSICA', coordenadorId: 'R003', funcoes: [{ nome: 'Z', minimo: 0, maximo: 1 }] })).sucesso, false, 'duplicada');

  const publica = plain(ctx.listarPastoraisPublico());
  const musica = publica.find((p) => p.nome === 'Música');
  assert.deepEqual(musica.funcoes.map((f) => f.nome), ['Violão', 'Canto']);

  // Pai.Tres passou a coordenar Música: já enxerga a pastoral, sem ser administrador
  const pai = entrar('Pai.Tres', 'senha33');
  const sessao = plain(ctx.validarSessao(pai));
  assert.deepEqual(sessao.pastoraisCoordenadas.map((p) => p.nome), ['Música']);
  assert.equal(sessao.administrador, false);
  assert.throws(() => ctx.criarMissa(pai, { data: ymd(20), horario: '10:00' }), /SEM_PERMISSAO/);

  // missa existente já tem vagas da nova pastoral, com o padrão das funções
  const missa = plain(ctx.listarMissasParaCoordenador(pai, r.id))[0];
  assert.deepEqual(missa.vagas.map((v) => [v.funcao, v.minimo, v.maximo]), [['Violão', 1, 2], ['Canto', 2, 5]]);
  assert.ok(!abas.Vagas.some((v) => v[1] === musica.funcoes[0].id), 'sem linha até alguém ajustar ou ser escalado');
});

test('administrador troca o coordenador e inativa pastoral', () => {
  const { ctx, entrar } = novoAmbiente();
  const admin = entrar('Admin.Quatro', 'admin44');
  assert.equal(plain(ctx.editarPastoral(admin, 'P002', { coordenadorId: 'R999' })).sucesso, false);
  assert.equal(plain(ctx.editarPastoral(admin, 'P002', { nome: 'Coroinhas e Cerimoniários' })).sucesso, false, 'nome já usado');
  assert.equal(plain(ctx.editarPastoral(admin, 'P999', { nome: 'X' })).sucesso, false);

  const antigoCoord = entrar('Leitor.Cinco', 'leitor55');
  assert.equal(plain(ctx.editarPastoral(admin, 'P002', {
    nome: 'Leitores e Salmistas', coordenadorId: 'R003',
    funcoes: [{ id: 'F003', nome: 'Leitor', minimo: 2, maximo: 3 }, { nome: 'Salmista', minimo: 0, maximo: 1 }],
  })).sucesso, true);
  assert.throws(() => ctx.listarMembros(antigoCoord, 'P002'), /SEM_PERMISSAO/, 'perdeu a coordenação');
  const novo = entrar('Pai.Tres', 'senha33');
  assert.equal(plain(ctx.listarMembros(novo, 'P002')).length, 1);

  const adm = plain(ctx.obterAdministracao(admin));
  const p2 = adm.pastorais.find((p) => p.id === 'P002');
  assert.equal(p2.nome, 'Leitores e Salmistas');
  assert.equal(p2.coordenador, 'Pai Tres');
  assert.deepEqual(p2.funcoes.map((f) => [f.nome, f.minimo, f.maximo]), [['Leitor', 2, 3], ['Salmista', 0, 1]]);

  assert.equal(plain(ctx.editarPastoral(admin, 'P002', { ativa: false })).sucesso, true);
  assert.deepEqual(ids(plain(ctx.listarPastoraisPublico())), ['P001']);
  assert.throws(() => ctx.listarMembros(novo, 'P002'), /SEM_PERMISSAO/, 'pastoral inativa não é gerida');
});

test('administrador só vê contagens: nenhum nome, telefone ou e-mail de pessoas', () => {
  const { ctx, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  ctx.inscrever(coord, 'E001', 'C001', 'F001');

  const admin = entrar('Admin.Quatro', 'admin44');
  const adm = plain(ctx.obterAdministracao(admin));
  const texto = JSON.stringify(adm.missas) + JSON.stringify(adm.pastorais);
  for (const proibido of ['Ana', 'Beto', 'Caio', 'Duda', '(11) 9', '@x.com', 'C001']) {
    assert.ok(!texto.includes(proibido), 'vazou ' + proibido);
  }
  const m = adm.missas[0].pastorais.find((p) => p.pastoralId === 'P001');
  assert.equal(m.escalados, 1);
  assert.ok(m.maximo >= 1);

  // e não consegue operar a pastoral só por ser administrador
  assert.throws(() => ctx.listarMembros(admin, 'P001'), /SEM_PERMISSAO/);
  assert.throws(() => ctx.inscrever(admin, 'E001', 'C003', 'F001'), /SEM_PERMISSAO/);
  assert.throws(() => ctx.ajustarVagas(admin, 'P001', 'E001', [{ funcaoId: 'F001', minimo: 0, maximo: 1 }]), /SEM_PERMISSAO/);
});

/* ---------- lembretes ---------- */

test('lembretes: cada coordenador recebe só a escala da própria pastoral', () => {
  const { ctx, emails, entrar } = novoAmbiente();
  const admin = entrar('Admin.Quatro', 'admin44');
  const c = plain(ctx.criarMissa(admin, { data: ymd(3), horario: '09:00', descricao: 'Em 3 dias' }));
  assert.equal(c.sucesso, true);

  const coord = entrar('Coord.Um', 'coord123');
  const leitor = entrar('Leitor.Cinco', 'leitor55');
  ctx.inscrever(coord, c.id, 'C001', 'F001');
  ctx.inscrever(leitor, c.id, 'C004', 'F003');
  emails.length = 0;

  const r = plain(ctx.enviarLembretesCoordenador(coord, 'P001'));
  assert.equal(r.sucesso, true);
  assert.equal(r.avisados, 1);
  const para = emails.map((e) => e.to).sort();
  assert.deepEqual(para, ['coord@x.com', 'mae2@x.com']);
  const familia = emails.find((e) => e.to === 'mae2@x.com');
  assert.match(familia.body, /Ana \(Coroinha, Coroinhas e Cerimoniários\)/);
  assert.ok(!emails.some((e) => /Leitor Cinco/.test(e.body)), 'não mistura outra pastoral');

  emails.length = 0;
  ctx.enviarLembretes(); // gatilho diário: todas as pastorais
  assert.deepEqual(emails.map((e) => e.to).sort(), ['coord@x.com', 'leitor5@x.com', 'leitor5@x.com', 'mae2@x.com']);
});
