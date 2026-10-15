/**
 * Testa as regras de segurança do Código.js (Apps Script) rodando-o em memória,
 * com planilha, cache, propriedades e e-mail simulados (ver harness.js).
 *
 *   node --test tests/apps-script/
 *
 * Cenário padrão (depois da migração):
 *   R001 Coord.Um   coordena P001 (Coroinhas e Cerimoniários) e é administrador (veio da migração)
 *   R002 Mae.Dois   filha Ana (Coroinha, ativa) e Duda (Coroinha, pendente)
 *   R003 Pai.Tres   filhos Beto (Cerimoniário) e Caio (Coroinha)
 *   R004 Admin.Quatro   só administrador
 *   R005 Leitor.Cinco   coordena P002 (Leitores) e é o próprio leitor
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const { novoAmbiente, plain, CODIGO } = require('./harness');

test('login com senha antiga em texto puro converte para hash e devolve token', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  assert.equal(abas.Responsaveis[2][3], 'senha22');
  const token = entrar('Mae.Dois', 'senha22');
  assert.match(abas.Responsaveis[2][3], /^h1\$[a-f0-9]{16}\$/);
  assert.ok(!abas.Responsaveis[2][3].includes('senha22'));
  assert.equal(ctx.validarLogin('mae.dois', 'senha22').sucesso, true);
  assert.ok(token.includes('.'));
});

test('senha errada não loga e bloqueia após 5 tentativas', () => {
  const { ctx } = novoAmbiente();
  for (let i = 0; i < 5; i++) {
    const r = ctx.validarLogin('Mae.Dois', 'errada' + i);
    assert.equal(r.sucesso, false);
    assert.match(r.mensagem, /incorretos/);
  }
  const bloqueado = ctx.validarLogin('Mae.Dois', 'senha22');
  assert.equal(bloqueado.sucesso, false);
  assert.match(bloqueado.mensagem, /Muitas tentativas/);
});

test('sem token válido nenhuma função de dados responde', () => {
  const { ctx } = novoAmbiente();
  for (const sessao of [undefined, '', 'lixo', 'a.b']) {
    assert.throws(() => ctx.listarMissas(sessao), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.listarMembros(sessao, 'P001'), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.obterAdministracao(sessao), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.criarMissa(sessao, {}), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.excluirMissa(sessao, 'E001', ''), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.inscrever(sessao, 'E001', 'C001', 'F001'), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.solicitarEntrada(sessao, 'C001', 'F001'), /SESSAO_INVALIDA/);
  }
});

test('token adulterado ou de outra assinatura é recusado', () => {
  const { ctx, entrar } = novoAmbiente();
  const tokenMae = entrar('Mae.Dois', 'senha22');
  const tokenAdmin = entrar('Admin.Quatro', 'admin44');
  const [, assinaturaMae] = tokenMae.split('.');
  const [payloadAdmin] = tokenAdmin.split('.');
  assert.throws(() => ctx.obterAdministracao(payloadAdmin + '.' + assinaturaMae), /SESSAO_INVALIDA/);
});

test('trocar a senha derruba as sessões antigas', () => {
  const { ctx, abas, emails, entrar } = novoAmbiente();
  const antigo = entrar('Mae.Dois', 'senha22');
  assert.ok(Array.isArray(plain(ctx.listarMissas(antigo))));

  ctx.solicitarRecuperacaoSenha('Mae.Dois');
  ctx.solicitarRecuperacaoSenha('Mae.Dois'); // segundo pedido seguido é ignorado
  assert.equal(abas.ResetSenha.length, 2);
  assert.equal(emails.length, 1);

  const tokenReset = abas.ResetSenha[1][0];
  assert.equal(plain(ctx.redefinirSenha(tokenReset, 'curta')).sucesso, false);
  assert.equal(plain(ctx.redefinirSenha(tokenReset, 'novasenha1')).sucesso, true);
  assert.equal(plain(ctx.redefinirSenha(tokenReset, 'outrasenha')).sucesso, false);

  assert.throws(() => ctx.listarMissas(antigo), /SESSAO_INVALIDA/);
  assert.equal(ctx.validarLogin('Mae.Dois', 'senha22').sucesso, false);
  assert.equal(ctx.validarLogin('Mae.Dois', 'novasenha1').sucesso, true);
});

test('e-mail de redefinição usa APP_URL quando configurada e ignora valor inválido', () => {
  const a = novoAmbiente();
  a.ctx.solicitarRecuperacaoSenha('Mae.Dois');
  assert.match(a.emails[0].body, /https:\/\/script\.google\.com\/macros\/s\/TESTE\/exec\?token=[a-f0-9]{32}/);

  const b = novoAmbiente();
  b.props.APP_URL = 'https://escala.exemplo.com/';
  b.ctx.solicitarRecuperacaoSenha('Mae.Dois');
  assert.match(b.emails[0].body, /https:\/\/escala\.exemplo\.com\/redefinir-senha\?token=[a-f0-9]{32}/);

  const c = novoAmbiente();
  c.props.APP_URL = 'javascript:alert(1)';
  c.ctx.solicitarRecuperacaoSenha('Mae.Dois');
  assert.ok(!c.emails[0].body.includes('javascript:'));
});

test('recuperação de senha não revela se o usuário existe', () => {
  const { ctx, abas } = novoAmbiente();
  assert.deepEqual(plain(ctx.solicitarRecuperacaoSenha('nao.existe')), { sucesso: true });
  assert.equal(abas.ResetSenha.length, 1);
});

test('sessão expira depois de 60 dias', () => {
  const { ctx, entrar } = novoAmbiente();
  const token = entrar('Mae.Dois', 'senha22');
  const DataDoContexto = vm.runInContext('Date', ctx);
  const agora = DataDoContexto.now;
  try {
    DataDoContexto.now = () => agora() + 61 * 24 * 60 * 60 * 1000;
    assert.throws(() => ctx.listarMissas(token), /SESSAO_INVALIDA/);
    assert.equal(plain(ctx.validarSessao(token)).sucesso, false);
  } finally {
    DataDoContexto.now = agora;
  }
  assert.equal(plain(ctx.validarSessao(token)).sucesso, true);
});

test('funções administrativas ficam bloqueadas sem PERMITIR_ADMIN', () => {
  const { ctx, props } = novoAmbiente();
  assert.throws(() => ctx.migrarParaMultiPastoral(), /bloqueada/);
  assert.throws(() => ctx.configurarPlanilha(), /bloqueada/);
  assert.throws(() => ctx.criarGatilhoDiario(), /bloqueada/);
  assert.throws(() => ctx.testeMissas(), /bloqueada/);
  assert.equal(props.PERMITIR_ADMIN, undefined);
});

test('funções internas (terminadas em _) não têm equivalente público', () => {
  const nomes = [...CODIGO.matchAll(/^function (\w+)\(/gm)].map((m) => m[1]);
  const publicas = nomes.filter((n) => !n.endsWith('_'));
  for (const perigosa of ['lerEventos', 'lerMembros', 'lerPessoas', 'montarRespostaLogin', 'proximoId',
    'gerarToken', 'hashSenha', 'gravarVaga', 'exigirAdministrador', 'exigirCoordenadorDe']) {
    assert.ok(!publicas.includes(perigosa), perigosa + ' não pode ser pública');
  }
});

/* ---------- API JSON (doPost) ---------- */

function chamarApi(ctx, corpo) {
  const contents = typeof corpo === 'string' ? corpo : JSON.stringify(corpo);
  return JSON.parse(ctx.doPost({ postData: { contents } }).getContent());
}

test('doPost: login e leitura de missas funcionam pelo JSON', () => {
  const { ctx } = novoAmbiente();
  const login = chamarApi(ctx, { acao: 'validarLogin', args: ['Mae.Dois', 'senha22'] });
  assert.equal(login.ok, true);
  assert.equal(login.dados.sucesso, true);
  assert.equal(login.dados.pessoas.length, 2);
  assert.equal(login.dados.administrador, false);

  const missas = chamarApi(ctx, { acao: 'listarMissas', args: [login.dados.token] });
  assert.equal(missas.ok, true);
  assert.equal(missas.dados.length, 1);
});

test('doPost: só aceita ações da lista (nada administrativo nem interno)', () => {
  const { ctx, abas } = novoAmbiente();
  const antes = abas.Eventos.length;
  for (const acao of ['migrarParaMultiPastoral', 'configurarPlanilha', 'lerEventos_', 'montarRespostaLogin_',
    'enviarLembretes', 'doGet', 'constructor', '__proto__', 'toString', 'gerarDadosTeste', '']) {
    const r = chamarApi(ctx, { acao, args: [] });
    assert.deepEqual(r, { ok: false, erro: 'ACAO_INVALIDA' }, 'ação ' + acao);
  }
  assert.equal(abas.Eventos.length, antes);
});

test('doPost: erros de sessão e de permissão voltam como código, sem detalhe interno', () => {
  const { ctx, entrar } = novoAmbiente();
  assert.deepEqual(chamarApi(ctx, { acao: 'listarMissas', args: ['lixo'] }), { ok: false, erro: 'SESSAO_INVALIDA' });
  const mae = entrar('Mae.Dois', 'senha22');
  assert.deepEqual(chamarApi(ctx, { acao: 'obterAdministracao', args: [mae] }), { ok: false, erro: 'SEM_PERMISSAO' });
  assert.deepEqual(chamarApi(ctx, { acao: 'listarMembros', args: [mae, 'P001'] }), { ok: false, erro: 'SEM_PERMISSAO' });
});

test('doPost: corpo vazio, grande demais ou JSON quebrado é recusado', () => {
  const { ctx } = novoAmbiente();
  assert.equal(chamarApi(ctx, '').erro, 'REQUISICAO_INVALIDA');
  assert.equal(chamarApi(ctx, '{nao e json').erro, 'REQUISICAO_INVALIDA');
  assert.equal(chamarApi(ctx, 'x'.repeat(20001)).erro, 'REQUISICAO_INVALIDA');
  assert.equal(chamarApi(ctx, { acao: 123 }).erro, 'ACAO_INVALIDA');
  assert.equal(JSON.parse(ctx.doPost(undefined).getContent()).erro, 'REQUISICAO_INVALIDA');
});

test('doPost: falha inesperada vira ERRO_INTERNO sem expor a mensagem', () => {
  const { ctx, abas } = novoAmbiente();
  delete abas.Responsaveis;
  const r = chamarApi(ctx, { acao: 'validarLogin', args: ['Mae.Dois', 'senha22'] });
  assert.deepEqual(r, { ok: false, erro: 'ERRO_INTERNO' });
});

test('lembretes agendados só disparam uma vez por dia', () => {
  const { ctx } = novoAmbiente();
  const primeira = plain(ctx.enviarLembretes());
  assert.equal(primeira.sucesso, true);
  assert.equal(primeira.repetido, undefined);
  assert.equal(plain(ctx.enviarLembretes()).repetido, true);
});
