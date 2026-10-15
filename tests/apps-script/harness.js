/**
 * Roda o Código.js (Apps Script) em memória, com planilha, cache, propriedades e e-mail simulados.
 * Usado pelos testes (security.test.js) e pela API local de desenvolvimento (mock-server.js).
 */
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

function novoAmbiente({ migrar = true, extras = true } = {}) {
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
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => (abas[n] ? sheet(n) : null),
        insertSheet: (n) => { abas[n] = []; return sheet(n); },
      }),
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
          u: String(d.getDay() === 0 ? 7 : d.getDay()), // 1 = segunda ... 7 = domingo, como no Apps Script
        }[fmt];
      },
    },
  });
  vm.runInContext(CODIGO, ctx, { filename: 'Código.js' });

  /** Converte as abas antigas para o modelo multi-pastoral, como a função do Apps Script faz em produção. */
  const migrarParaMultiPastoral = () => {
    props.PERMITIR_ADMIN = 'sim';
    try {
      return plain(ctx.migrarParaMultiPastoral());
    } finally {
      delete props.PERMITIR_ADMIN;
    }
  };

  /** Segunda pastoral (Leitores, com adulto), um administrador só administrador e um pedido pendente. */
  const semearExtras = () => {
    abas.Responsaveis.push(['R004', 'Admin Quatro', 'Admin.Quatro', 'admin44', 'admin4@x.com', '(11) 90000-0004', false, true]);
    abas.Responsaveis.push(['R005', 'Leitor Cinco', 'Leitor.Cinco', 'leitor55', 'leitor5@x.com', '(11) 90000-0005', false, false]);
    abas.Criancas.push(['C004', 'Leitor Cinco', '', 'adulto']);
    abas.Vinculos.push(['R005', 'C004']);
    abas.Pastorais.push(['P002', 'Leitores', 'R005', true]);
    abas.Funcoes.push(['F003', 'P002', 'Leitor', 1, 2]);
    abas.Membros.push(['C004', 'P002', 'F003', 'ativo']);
    abas.Criancas.push(['C005', 'Duda', '', 'crianca']);
    abas.Vinculos.push(['R002', 'C005']);
    abas.Membros.push(['C005', 'P001', 'F001', 'pendente']);
  };

  if (migrar) {
    migrarParaMultiPastoral();
    if (extras) semearExtras();
  }

  const entrar = (usuario, senha) => {
    const r = ctx.validarLogin(usuario, senha);
    assert.equal(r.sucesso, true, 'login deveria funcionar para ' + usuario);
    return r.token;
  };
  return { ctx, abas, props, cache, emails, entrar, migrarParaMultiPastoral, semearExtras };
}

module.exports = { novoAmbiente, plain, CODIGO };

