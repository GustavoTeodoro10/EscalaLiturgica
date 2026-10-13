/**
 * Testa as regras de segurança do Código.js (Apps Script) rodando-o em memória,
 * com planilha, cache, propriedades e e-mail simulados.
 *
 *   node --test tests/apps-script/security.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CODIGO = fs.readFileSync(path.join(__dirname, '..', '..', 'apps-script', 'Código.js'), 'utf8');

const toBuf = (x) =>
  Buffer.isBuffer(x) ? x : Array.isArray(x) ? Buffer.from(x.map((b) => b & 255)) : Buffer.from(String(x), 'utf8');
const toSigned = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const plain = (v) => JSON.parse(JSON.stringify(v));

function novoAmbiente() {
  const futura = new Date();
  futura.setDate(futura.getDate() + 5);
  futura.setHours(0, 0, 0, 0);

  const abas = {
    Responsaveis: [
      ['ID', 'Nome', 'Usuario', 'Senha', 'Email', 'Celular', 'Coordenador'],
      ['R001', 'Coord Um', 'Coord.Um', 'coord123', 'coord@x.com', '(11) 90000-0001', true],
      ['R002', 'Mae Dois', 'Mae.Dois', 'senha22', 'mae2@x.com', '(11) 90000-0002', false],
      ['R003', 'Pai Tres', 'Pai.Tres', 'senha33', 'pai3@x.com', '(11) 90000-0003', false],
    ],
    Criancas: [
      ['ID', 'Nome', 'Funcao'],
      ['C001', 'Ana', 'Coroinha'],
      ['C002', 'Beto', 'Cerimoniário'],
      ['C003', 'Caio', 'Coroinha'],
    ],
    Vinculos: [
      ['ResponsavelID', 'CriancaID'],
      ['R002', 'C001'],
      ['R003', 'C002'],
      ['R003', 'C003'],
    ],
    Missas: [
      ['Data', 'Horario', 'Descricao', 'MinCoroinha', 'MaxCoroinha', 'CoroinhasEscalados',
        'MinCerimoniario', 'MaxCerimoniario', 'CerimoniariosEscalados'],
      [futura, '19:00', 'Missa', 1, 3, '', 1, 2, ''],
    ],
    ResetSenha: [['Token', 'ResponsavelID', 'ExpiraEm', 'Usado']],
  };

  const sheet = (nome) => {
    const linhas = abas[nome];
    return {
      getName: () => nome,
      getDataRange: () => ({ getValues: () => linhas.map((l) => l.slice()) }),
      getLastRow: () => linhas.length,
      appendRow: (r) => { linhas.push(r.slice()); },
      deleteRow: (n) => { linhas.splice(n - 1, 1); },
      getRange: (r, c) => ({
        getValue: () => (linhas[r - 1] && linhas[r - 1][c - 1] !== undefined ? linhas[r - 1][c - 1] : ''),
        setValue: (v) => {
          while (linhas.length < r) linhas.push([]);
          linhas[r - 1][c - 1] = v;
        },
      }),
    };
  };

  const props = {};
  const cache = {};
  const emails = [];
  const p2 = (n) => String(n).padStart(2, '0');

  const ctx = vm.createContext({
    console,
    Logger: { log() {} },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TESTE/exec' }) },
    MailApp: { sendEmail: (m) => emails.push(m) },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: (txt) => ({
        setMimeType() { return this; },
        getContent: () => txt,
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = v; },
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in cache ? cache[k] : null),
        put: (k, v) => { cache[k] = v; },
        remove: (k) => { delete cache[k]; },
      }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: (n) => (abas[n] ? sheet(n) : null) }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeHmacSha256Signature: (v, k) =>
        toSigned(crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()),
      computeDigest: (_algo, v) => toSigned(crypto.createHash('sha256').update(toBuf(v)).digest()),
      base64EncodeWebSafe: (x) => toBuf(x).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: (s) => toSigned(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
      newBlob: (bytes) => ({ getDataAsString: () => toBuf(bytes).toString('utf8') }),
      formatDate: (d, _tz, fmt) => {
        d = new Date(d);
        const dias = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return {
          'dd/MM/yyyy': `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`,
          'yyyy-MM-dd': `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
          'HH:mm': `${p2(d.getHours())}:${p2(d.getMinutes())}`,
          EEEE: dias[d.getDay()],
        }[fmt];
      },
    },
  });
  vm.runInContext(CODIGO, ctx, { filename: 'Código.js' });

  const entrar = (usuario, senha) => {
    const r = ctx.validarLogin(usuario, senha);
    assert.equal(r.sucesso, true, 'login deveria funcionar para ' + usuario);
    return r.token;
  };
  return { ctx, abas, props, cache, emails, entrar };
}

test('login com senha antiga em texto puro converte para hash e devolve token', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  assert.equal(abas.Responsaveis[2][3], 'senha22');
  const token = entrar('Mae.Dois', 'senha22');
  assert.match(abas.Responsaveis[2][3], /^h1\$[a-f0-9]{16}\$/);
  assert.ok(!abas.Responsaveis[2][3].includes('senha22'));
  // continua entrando com a mesma senha depois da conversão
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
  const bloqueado = ctx.validarLogin('Mae.Dois', 'senha22'); // até a senha certa é recusada
  assert.equal(bloqueado.sucesso, false);
  assert.match(bloqueado.mensagem, /Muitas tentativas/);
});

test('sem token válido nenhuma função de dados responde', () => {
  const { ctx } = novoAmbiente();
  for (const sessao of [undefined, '', 'lixo', 'a.b']) {
    assert.throws(() => ctx.listarMissas(sessao), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.listarCriancas(sessao), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.obterResponsaveisParaChamar(sessao, 2, 'Coroinha'), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.excluirMissa(sessao, 2, ''), /SESSAO_INVALIDA/);
    assert.throws(() => ctx.inscrever(sessao, 2, 'C001', 'Coroinha'), /SESSAO_INVALIDA/);
  }
});

test('token adulterado ou de outra assinatura é recusado', () => {
  const { ctx, entrar } = novoAmbiente();
  const tokenMae = entrar('Mae.Dois', 'senha22');
  const tokenCoord = entrar('Coord.Um', 'coord123');
  const [, assinaturaMae] = tokenMae.split('.');
  const [payloadCoord] = tokenCoord.split('.');
  // payload do coordenador com a assinatura da mãe
  assert.throws(() => ctx.listarCriancas(payloadCoord + '.' + assinaturaMae), /SESSAO_INVALIDA/);
});

test('responsável comum não acessa funções de coordenador', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const token = entrar('Mae.Dois', 'senha22');
  assert.throws(() => ctx.listarCriancas(token), /SEM_PERMISSAO/);
  assert.throws(() => ctx.listarMissasParaCoordenador(token), /SEM_PERMISSAO/);
  assert.throws(() => ctx.obterResumoCoordenador(token), /SEM_PERMISSAO/);
  assert.throws(() => ctx.obterResponsaveisParaChamar(token, 2, 'Coroinha'), /SEM_PERMISSAO/);
  assert.throws(() => ctx.excluirMissa(token, 2, ''), /SEM_PERMISSAO/);
  assert.throws(() => ctx.editarMissa(token, 2, { descricao: 'x' }), /SEM_PERMISSAO/);
  assert.throws(() => ctx.gerarMissasRecorrentes(token, { diaSemana: 'domingo', horario: '10:00', semanas: 2 }), /SEM_PERMISSAO/);
  assert.throws(() => ctx.enviarLembretesCoordenador(token), /SEM_PERMISSAO/);
  assert.equal(abas.Missas.length, 2, 'nenhuma missa pode ter sido alterada');
});

test('responsável só escala os próprios filhos e só na função certa', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const mae = entrar('Mae.Dois', 'senha22'); // filha: C001 (Coroinha)
  assert.throws(() => ctx.inscrever(mae, 2, 'C002', 'Cerimoniário'), /SEM_PERMISSAO/); // filho de outro
  assert.throws(() => ctx.cancelar(mae, 2, 'C003', 'Coroinha'), /SEM_PERMISSAO/);

  assert.equal(plain(ctx.inscrever(mae, 2, 'C001', 'Cerimoniário')).sucesso, false); // função errada
  assert.equal(plain(ctx.inscrever(mae, 999, 'C001', 'Coroinha')).sucesso, false); // linha inexistente
  assert.equal(plain(ctx.inscrever(mae, 2, 'C001', 'Coroinha')).sucesso, true);
  assert.equal(abas.Missas[1][5], 'C001');
  assert.equal(plain(ctx.inscrever(mae, 2, 'C001', 'Coroinha')).sucesso, false); // já escalada
  assert.equal(plain(ctx.cancelar(mae, 2, 'C001', 'Coroinha')).sucesso, true);
  assert.equal(abas.Missas[1][5], '');
});

test('coordenador consegue escalar qualquer criança e excluir com conferência de data', () => {
  const { ctx, abas, entrar } = novoAmbiente();
  const coord = entrar('Coord.Um', 'coord123');
  assert.equal(plain(ctx.inscrever(coord, 2, 'C003', 'Coroinha')).sucesso, true);
  assert.equal(plain(ctx.listarCriancas(coord)).length, 3);

  const missa = plain(ctx.listarMissasParaCoordenador(coord))[0];
  const recusa = plain(ctx.excluirMissa(coord, missa.linha, '01/01/2000'));
  assert.equal(recusa.sucesso, false);
  assert.equal(abas.Missas.length, 2);

  assert.equal(plain(ctx.excluirMissa(coord, missa.linha, missa.data)).sucesso, true);
  assert.equal(abas.Missas.length, 1);
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
  assert.equal(plain(ctx.redefinirSenha(tokenReset, 'outrasenha')).sucesso, false); // link já usado

  assert.throws(() => ctx.listarMissas(antigo), /SESSAO_INVALIDA/);
  assert.equal(ctx.validarLogin('Mae.Dois', 'senha22').sucesso, false);
  assert.equal(ctx.validarLogin('Mae.Dois', 'novasenha1').sucesso, true);
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

test('cadastro limpa HTML/fórmulas, valida função e guarda senha com hash', () => {
  const { ctx, abas } = novoAmbiente();
  const r = plain(ctx.cadastrarResponsavel({
    nome: '=HYPERLINK("http://x")<b>Maria</b> Silva',
    email: 'MARIA@exemplo.com',
    celular: '+55 (11) 98888-7777',
    senha: 'abcdef',
    filhos: [
      { nome: '<img src=x onerror=alert(1)>Joao', funcao: 'Coroinha' },
      { nome: 'Invasor', funcao: 'Administrador' },
    ],
  }));
  assert.equal(r.sucesso, true);
  const nova = abas.Responsaveis[abas.Responsaveis.length - 1];
  assert.ok(!/^[=+\-@]/.test(nova[1]), 'nome não pode começar como fórmula');
  assert.ok(!/[<>]/.test(nova[1]));
  assert.equal(nova[4], 'maria@exemplo.com');
  assert.match(nova[3], /^h1\$/);
  assert.equal(nova[6], false, 'cadastro nunca vira coordenador');
  assert.equal(r.criancas.length, 1, 'filho com função inválida é descartado');
  assert.ok(!/[<>]/.test(r.criancas[0].nome));

  assert.equal(plain(ctx.cadastrarResponsavel({
    nome: 'Fulano', email: 'f@x.com', senha: '123', filhos: [{ nome: 'A', funcao: 'Coroinha' }],
  })).sucesso, false, 'senha curta recusada');
});

test('funções administrativas ficam bloqueadas sem PERMITIR_ADMIN', () => {
  const { ctx, abas, props } = novoAmbiente();
  assert.throws(() => ctx.gerarDadosTeste(), /bloqueada/);
  assert.throws(() => ctx.configurarPlanilha(), /bloqueada/);
  assert.throws(() => ctx.criarGatilhoDiario(), /bloqueada/);
  assert.throws(() => ctx.testeMissas(), /bloqueada/);
  assert.equal(abas.Vinculos.length, 4, 'vínculos intactos');
  assert.equal(abas.Missas.length, 2, 'missas intactas');
  assert.equal(props.PERMITIR_ADMIN, undefined);
});

test('funções internas (terminadas em _) não têm equivalente público', () => {
  const nomes = [...CODIGO.matchAll(/^function (\w+)\(/gm)].map((m) => m[1]);
  const publicas = nomes.filter((n) => !n.endsWith('_'));
  // nada que devolva dados cruus pode estar exposto
  for (const perigosa of ['lerMissasBrutas', 'mapaCriancas', 'montarRespostaLogin', 'proximoId', 'gerarToken', 'hashSenha']) {
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
  assert.equal(login.dados.criancas.length, 1);

  const missas = chamarApi(ctx, { acao: 'listarMissas', args: [login.dados.token] });
  assert.equal(missas.ok, true);
  assert.equal(missas.dados.length, 1);
});

test('doPost: só aceita ações da lista (nada administrativo nem interno)', () => {
  const { ctx, abas } = novoAmbiente();
  for (const acao of ['gerarDadosTeste', 'configurarPlanilha', 'lerMissasBrutas_', 'mapaCriancas_',
    'enviarLembretes', 'doGet', 'constructor', '__proto__', 'toString', '']) {
    const r = chamarApi(ctx, { acao, args: [] });
    assert.deepEqual(r, { ok: false, erro: 'ACAO_INVALIDA' }, 'ação ' + acao);
  }
  assert.equal(abas.Missas.length, 2);
  assert.equal(abas.Vinculos.length, 4);
});

test('doPost: erros de sessão e de permissão voltam como código, sem detalhe interno', () => {
  const { ctx, entrar } = novoAmbiente();
  assert.deepEqual(chamarApi(ctx, { acao: 'listarMissas', args: ['lixo'] }), { ok: false, erro: 'SESSAO_INVALIDA' });
  const mae = entrar('Mae.Dois', 'senha22');
  assert.deepEqual(chamarApi(ctx, { acao: 'listarCriancas', args: [mae] }), { ok: false, erro: 'SEM_PERMISSAO' });
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
  delete abas.Responsaveis; // planilha quebrada
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
