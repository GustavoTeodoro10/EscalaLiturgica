/**
 * App de Escala de Coroinhas e Cerimoniários — Paróquia São Vicente de Paulo (Mauá-SP)
 * ---------------------------------------------------------------------------------
 * Abas necessárias (rode configurarPlanilha() uma vez para criar tudo):
 *
 *  "Responsaveis" -> ID | Nome | Usuario | Senha | Email | Celular | Coordenador
 *  "Criancas"     -> ID | Nome | Funcao
 *  "Vinculos"     -> ResponsavelID | CriancaID        (relação N:N)
 *  "Missas"       -> Data | Horario | Descricao |
 *                    MinCoroinha | MaxCoroinha | CoroinhasEscalados |
 *                    MinCerimoniario | MaxCerimoniario | CerimoniariosEscalados
 *                    (as colunas "Escalados" guardam IDs de crianças, separados por vírgula)
 *  "ResetSenha"   -> Token | ResponsavelID | ExpiraEm | Usado
 *
 * SEGURANÇA
 *  - Toda função chamável pelo navegador recebe o token de sessão e valida no servidor.
 *  - Funções cujo nome termina com "_" são internas: o Apps Script NÃO as expõe ao navegador.
 *  - Senhas ficam com hash (formato h1$salt$hash). Senhas antigas em texto puro são
 *    convertidas automaticamente no próximo login de cada pessoa.
 *  - Funções administrativas (configurarPlanilha, criarGatilhoDiario, testeMissas,
 *    gerarDadosTeste) só rodam se a propriedade de script PERMITIR_ADMIN = sim existir.
 */

const ABA_RESPONSAVEIS = 'Responsaveis';
const ABA_CRIANCAS = 'Criancas';
const ABA_VINCULOS = 'Vinculos';
const ABA_MISSAS = 'Missas';
const ABA_RESET = 'ResetSenha';

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const PARÓQUIA = {
  nome: 'Paróquia São Vicente de Paulo',
  endereco: 'R. Vice-Presidente Francisco Silviano Alves Brandão, 88 - Parque São Vicente, Mauá - SP, 09371-160',
  telefone: '(11) 4555-4205'
};

const TEMPLATE_MENSAGEM_CHAMADA =
  'Olá, {responsavel}! Está faltando gente pra servir como {funcao} na missa de {diaSemana}, {data} às {horario}{descricaoTexto}. {crianca} pode ajudar? Qualquer confirmação, me avisa por aqui.\n\n— {paroquia}';

/* Segurança */
const FUNCOES_VALIDAS = ['Coroinha', 'Cerimoniário'];
const SESSAO_VALIDADE_MS = 60 * 24 * 60 * 60 * 1000; // 60 dias, renovada a cada abertura do app
const SENHA_MINIMA = 6;
const LOGIN_MAX_FALHAS = 5;
const LOGIN_BLOQUEIO_SEG = 15 * 60;
const CADASTROS_POR_HORA = 20;
const RECUPERACOES_POR_HORA = 30;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TOKEN_RESET = /^[a-f0-9]{32}$/;
const REGEX_HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/;

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  const token = (e && e.parameter && e.parameter.token) ? String(e.parameter.token) : '';
  template.tokenReset = REGEX_TOKEN_RESET.test(token) ? token : '';
  return template.evaluate()
    .setTitle('Escala de Coroinhas e Cerimoniários')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------------------------------------------------------------------- */
/* API JSON (usada pelo app Expo/web)                                     */
/* ---------------------------------------------------------------------- */

/**
 * Única porta de entrada HTTP para dados. Só as ações desta lista existem;
 * a autorização de cada uma (token, papel, dono da criança) vive dentro da própria função.
 * Pedido:  POST  { "acao": "listarMissas", "args": ["<token>"] }   (Content-Type: text/plain)
 * Resposta: { "ok": true, "dados": ... }  ou  { "ok": false, "erro": "SESSAO_INVALIDA" }
 */
const ACOES_API = {
  validarLogin: validarLogin,
  validarSessao: validarSessao,
  cadastrarResponsavel: cadastrarResponsavel,
  solicitarRecuperacaoSenha: solicitarRecuperacaoSenha,
  redefinirSenha: redefinirSenha,
  listarMissas: listarMissas,
  inscrever: inscrever,
  cancelar: cancelar,
  listarCriancas: listarCriancas,
  listarMissasParaCoordenador: listarMissasParaCoordenador,
  obterResumoCoordenador: obterResumoCoordenador,
  obterResponsaveisParaChamar: obterResponsaveisParaChamar,
  gerarMissasRecorrentes: gerarMissasRecorrentes,
  editarMissa: editarMissa,
  excluirMissa: excluirMissa,
  enviarLembretesCoordenador: enviarLembretesCoordenador
};

const ERROS_API_CONHECIDOS = ['SESSAO_INVALIDA', 'SEM_PERMISSAO', 'ACAO_INVALIDA', 'REQUISICAO_INVALIDA'];

function codigoErroApi_(err) {
  const msg = String(err && err.message ? err.message : err);
  for (let i = 0; i < ERROS_API_CONHECIDOS.length; i++) {
    if (msg.indexOf(ERROS_API_CONHECIDOS[i]) !== -1) return ERROS_API_CONHECIDOS[i];
  }
  console.error('Erro na API: ' + msg); // fica nos logs do Apps Script, nunca vai para o cliente
  return 'ERRO_INTERNO';
}

function doPost(e) {
  let resposta;
  try {
    const bruto = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
    if (!bruto || bruto.length > 20000) throw new Error('REQUISICAO_INVALIDA');

    let corpo;
    try {
      corpo = JSON.parse(bruto);
    } catch (errJson) {
      throw new Error('REQUISICAO_INVALIDA');
    }

    const acao = corpo && typeof corpo.acao === 'string' ? corpo.acao : '';
    if (!Object.prototype.hasOwnProperty.call(ACOES_API, acao)) throw new Error('ACAO_INVALIDA');

    const args = Array.isArray(corpo.args) ? corpo.args.slice(0, 4) : [];
    resposta = { ok: true, dados: ACOES_API[acao].apply(null, args) };
  } catch (err) {
    resposta = { ok: false, erro: codigoErroApi_(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------- */
/* Funções administrativas (só rodam com PERMITIR_ADMIN = sim)            */
/* ---------------------------------------------------------------------- */

function exigirAdmin_() {
  if (PropertiesService.getScriptProperties().getProperty('PERMITIR_ADMIN') !== 'sim') {
    throw new Error('Função administrativa bloqueada. No editor: Configurações do projeto > ' +
      'Propriedades do script > adicione PERMITIR_ADMIN = sim, rode a função e depois remova a propriedade.');
  }
}

/** Rode uma vez pelo editor para criar as abas com cabeçalhos e exemplo. */
function configurarPlanilha() {
  exigirAdmin_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const resp = ss.getSheetByName(ABA_RESPONSAVEIS) || ss.insertSheet(ABA_RESPONSAVEIS);
  if (resp.getLastRow() === 0) {
    resp.appendRow(['ID', 'Nome', 'Usuario', 'Senha', 'Email', 'Celular', 'Coordenador']);
    resp.appendRow(['R001', 'Coordenador Exemplo', 'Coordenador.Exemplo', codificarSenha_('troque-esta-senha'), 'coordenador@exemplo.com', '(11) 90000-0000', true]);
  }

  const crianca = ss.getSheetByName(ABA_CRIANCAS) || ss.insertSheet(ABA_CRIANCAS);
  if (crianca.getLastRow() === 0) {
    crianca.appendRow(['ID', 'Nome', 'Funcao']);
  }

  const vinc = ss.getSheetByName(ABA_VINCULOS) || ss.insertSheet(ABA_VINCULOS);
  if (vinc.getLastRow() === 0) {
    vinc.appendRow(['ResponsavelID', 'CriancaID']);
  }

  const missas = ss.getSheetByName(ABA_MISSAS) || ss.insertSheet(ABA_MISSAS);
  if (missas.getLastRow() === 0) {
    missas.appendRow(['Data', 'Horario', 'Descricao',
      'MinCoroinha', 'MaxCoroinha', 'CoroinhasEscalados',
      'MinCerimoniario', 'MaxCerimoniario', 'CerimoniariosEscalados']);
  }

  const reset = ss.getSheetByName(ABA_RESET) || ss.insertSheet(ABA_RESET);
  if (reset.getLastRow() === 0) {
    reset.appendRow(['Token', 'ResponsavelID', 'ExpiraEm', 'Usado']);
  }
}

/* ---------------------------------------------------------------------- */
/* Utilidades internas                                                    */
/* ---------------------------------------------------------------------- */

function removerAcentos_(txt) {
  return String(txt).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function proximoId_(sheet, prefixo) {
  const dados = sheet.getDataRange().getValues();
  let maior = 0;
  for (let i = 1; i < dados.length; i++) {
    const id = String(dados[i][0] || '');
    const num = parseInt(id.replace(prefixo, ''), 10);
    if (!isNaN(num) && num > maior) maior = num;
  }
  const novo = maior + 1;
  return prefixo + String(novo).padStart(3, '0');
}

function gerarUsuario_(nomeCompleto, usuariosExistentes) {
  const partes = removerAcentos_(nomeCompleto).trim().split(/\s+/);
  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  let base = primeiro + '.' + ultimo;
  base = base.charAt(0).toUpperCase() + base.slice(1, base.indexOf('.') + 1).toLowerCase() +
    base.charAt(base.indexOf('.') + 1).toUpperCase() + base.slice(base.indexOf('.') + 2).toLowerCase();

  const existentesLower = usuariosExistentes.map(u => String(u).toLowerCase());
  let usuario = base;
  let contador = 2;
  while (existentesLower.includes(usuario.toLowerCase())) {
    usuario = base + contador;
    contador++;
  }
  return usuario;
}

function gerarToken_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function urlDoApp_() {
  return ScriptApp.getService().getUrl();
}

function ehVerdadeiro_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

/** Texto vindo do usuário: sem HTML, sem quebras, sem início de fórmula de planilha, com limite. */
function limparTexto_(valor, max) {
  let t = String(valor === null || valor === undefined ? '' : valor)
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/^[=+\-@\s]+/, '');
  return t.slice(0, max);
}

function linhaValida_(sheet, linha) {
  return Number.isInteger(linha) && linha >= 2 && linha <= sheet.getLastRow();
}

function numeroLimitado_(valor, max) {
  const n = Math.floor(Number(valor));
  if (isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

/* ---------------------------------------------------------------------- */
/* Segredo, senhas e sessão                                               */
/* ---------------------------------------------------------------------- */

function obterSegredo_() {
  const props = PropertiesService.getScriptProperties();
  let segredo = props.getProperty('SEGREDO_SESSAO');
  if (!segredo) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      segredo = props.getProperty('SEGREDO_SESSAO');
      if (!segredo) {
        segredo = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
        props.setProperty('SEGREDO_SESSAO', segredo);
      }
    } finally {
      lock.releaseLock();
    }
  }
  return segredo;
}

function assinar_(texto) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, obterSegredo_()));
}

/** Comparação sem atalho por tamanho de prefixo igual (evita vazar por tempo de resposta). */
function iguais_(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function hashSenha_(senha, salt) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(senha).trim(), salt));
}

/** Formato guardado na planilha: h1$salt$hash */
function codificarSenha_(senha) {
  const salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  return 'h1$' + salt + '$' + hashSenha_(senha, salt);
}

function conferirSenha_(armazenada, informada) {
  const guardada = String(armazenada === null || armazenada === undefined ? '' : armazenada);
  const tentativa = String(informada === null || informada === undefined ? '' : informada);
  if (guardada.indexOf('h1$') === 0) {
    const partes = guardada.split('$');
    if (partes.length !== 3) return { ok: false, legado: false };
    return { ok: iguais_(hashSenha_(tentativa, partes[1]), partes[2]), legado: false };
  }
  // formato antigo (texto puro): aceita e pede conversão para hash
  const ok = guardada.trim() !== '' && iguais_(guardada.trim(), tentativa.trim());
  return { ok: ok, legado: ok };
}

/** Pedaço do hash atual: trocar a senha invalida todas as sessões antigas. */
function versaoSenha_(celula) {
  const s = String(celula === null || celula === undefined ? '' : celula);
  if (s.indexOf('h1$') !== 0) return 'legado';
  const partes = s.split('$');
  return partes.length === 3 ? partes[2].slice(-10) : 'legado';
}

function criarSessao_(id, celulaSenha) {
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify({
    i: String(id),
    v: versaoSenha_(celulaSenha),
    e: Date.now() + SESSAO_VALIDADE_MS
  }), Utilities.Charset.UTF_8);
  return payload + '.' + assinar_(payload);
}

function lerSessao_(sessao) {
  if (!sessao || typeof sessao !== 'string' || sessao.length > 600) return null;
  const partes = sessao.split('.');
  if (partes.length !== 2) return null;
  if (!iguais_(assinar_(partes[0]), partes[1])) return null;
  try {
    const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString());
    if (!p || !p.i || !p.e || p.e < Date.now()) return null;
    return p;
  } catch (err) {
    return null;
  }
}

/** Confere o token e relê o responsável na planilha (papel de coordenador sempre atual). */
function autenticar_(sessao) {
  const p = lerSessao_(sessao);
  if (!p) throw new Error('SESSAO_INVALIDA');
  const dados = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) !== String(p.i)) continue;
    if (versaoSenha_(dados[i][3]) !== p.v) throw new Error('SESSAO_INVALIDA');
    return {
      id: dados[i][0],
      nome: dados[i][1],
      email: dados[i][4],
      celular: dados[i][5],
      coordenador: ehVerdadeiro_(dados[i][6]),
      senhaCelula: dados[i][3]
    };
  }
  throw new Error('SESSAO_INVALIDA');
}

function exigirCoordenador_(sessao) {
  const u = autenticar_(sessao);
  if (!u.coordenador) throw new Error('SEM_PERMISSAO');
  return u;
}

function criancaDoResponsavel_(responsavelId, criancaId) {
  const vinculos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_VINCULOS).getDataRange().getValues();
  for (let i = 1; i < vinculos.length; i++) {
    if (String(vinculos[i][0]) === String(responsavelId) && String(vinculos[i][1]) === String(criancaId)) return true;
  }
  return false;
}

/* ---------- limites de tentativas (CacheService) ---------- */

function chaveLimite_(tipo, valor) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(valor).toLowerCase());
  return 'rl_' + tipo + '_' + Utilities.base64EncodeWebSafe(digest).slice(0, 24);
}

function lerContagem_(chave) {
  return Number(CacheService.getScriptCache().get(chave) || 0);
}

function somarContagem_(chave, ttlSeg) {
  const n = lerContagem_(chave) + 1;
  CacheService.getScriptCache().put(chave, String(n), ttlSeg);
  return n;
}

/* ---------------------------------------------------------------------- */
/* Login / Cadastro                                                       */
/* ---------------------------------------------------------------------- */

/** Valida usuário + senha. Devolve dados do responsável, das crianças e o token de sessão. */
function validarLogin(usuario, senha) {
  const usuarioBusca = String(usuario === null || usuario === undefined ? '' : usuario).trim().toLowerCase().slice(0, 100);
  const senhaBusca = String(senha === null || senha === undefined ? '' : senha).trim().slice(0, 100);
  if (!usuarioBusca || !senhaBusca) return { sucesso: false, mensagem: 'Preencha usuário e senha.' };

  const chave = chaveLimite_('login', usuarioBusca);
  if (lerContagem_(chave) >= LOGIN_MAX_FALHAS) {
    return { sucesso: false, mensagem: 'Muitas tentativas. Aguarde 15 minutos ou use "Esqueci minha senha".' };
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_RESPONSAVEIS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    const [id, nome, usr, senhaPlanilha, email, celular, coordenador] = dados[i];
    if (String(usr).trim().toLowerCase() !== usuarioBusca) continue;

    const r = conferirSenha_(senhaPlanilha, senhaBusca);
    if (!r.ok) break;

    let celulaSenha = senhaPlanilha;
    if (r.legado) {
      celulaSenha = codificarSenha_(senhaBusca);
      sheet.getRange(i + 1, 4).setValue(celulaSenha);
    }
    CacheService.getScriptCache().remove(chave);

    return montarRespostaLogin_({ id: id, nome: nome, coordenador: ehVerdadeiro_(coordenador) },
      criarSessao_(id, celulaSenha));
  }

  somarContagem_(chave, LOGIN_BLOQUEIO_SEG);
  return { sucesso: false, mensagem: 'Usuário ou senha incorretos.' };
}

/** Reabre a sessão a partir do token guardado no aparelho (renova a validade). */
function validarSessao(sessao) {
  try {
    const u = autenticar_(sessao);
    return montarRespostaLogin_(u, criarSessao_(u.id, u.senhaCelula));
  } catch (err) {
    return { sucesso: false };
  }
}

function montarRespostaLogin_(resp, token) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const vinculos = ss.getSheetByName(ABA_VINCULOS).getDataRange().getValues();
  const criancasDados = ss.getSheetByName(ABA_CRIANCAS).getDataRange().getValues();

  const funcaoPorId = {};
  const nomePorId = {};
  for (let i = 1; i < criancasDados.length; i++) {
    const [id, nome, funcao] = criancasDados[i];
    if (id) { funcaoPorId[id] = funcao; nomePorId[id] = nome; }
  }

  const criancas = [];
  for (let i = 1; i < vinculos.length; i++) {
    const [responsavelId, criancaId] = vinculos[i];
    if (String(responsavelId) === String(resp.id)) {
      criancas.push({ id: criancaId, nome: nomePorId[criancaId], funcao: funcaoPorId[criancaId] });
    }
  }

  return {
    sucesso: true,
    token: token,
    responsavelId: resp.id,
    responsavel: resp.nome,
    coordenador: resp.coordenador,
    criancas: criancas
  };
}

/** Cadastra um novo responsável e seus filhos, e já retorna logado. */
function cadastrarResponsavel(dados) {
  dados = dados || {};
  const nome = limparTexto_(dados.nome, 80);
  const email = limparTexto_(dados.email, 120).toLowerCase();
  const celular = String(dados.celular === null || dados.celular === undefined ? '' : dados.celular)
    .replace(/[^0-9 ()\-]/g, '').replace(/^[\-\s]+/, '').slice(0, 20);
  const senha = String(dados.senha === null || dados.senha === undefined ? '' : dados.senha).trim();
  const filhosEntrada = Array.isArray(dados.filhos) ? dados.filhos.slice(0, 8) : [];
  const filhos = filhosEntrada
    .map(function (f) { return { nome: limparTexto_(f && f.nome, 80), funcao: f && f.funcao }; })
    .filter(function (f) { return f.nome && FUNCOES_VALIDAS.indexOf(f.funcao) !== -1; });

  if (!nome || !email || !senha || filhos.length === 0) {
    return { sucesso: false, mensagem: 'Preencha nome, e-mail, senha e ao menos um filho.' };
  }
  if (!REGEX_EMAIL.test(email)) {
    return { sucesso: false, mensagem: 'E-mail inválido.' };
  }
  if (senha.length < SENHA_MINIMA || senha.length > 100) {
    return { sucesso: false, mensagem: 'A senha deve ter entre ' + SENHA_MINIMA + ' e 100 caracteres.' };
  }

  const chaveGlobal = 'rl_cadastro_global';
  if (lerContagem_(chaveGlobal) >= CADASTROS_POR_HORA) {
    return { sucesso: false, mensagem: 'Muitos cadastros em pouco tempo. Tente novamente mais tarde.' };
  }
  somarContagem_(chaveGlobal, 3600);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const respSheet = ss.getSheetByName(ABA_RESPONSAVEIS);
    const criancaSheet = ss.getSheetByName(ABA_CRIANCAS);
    const vincSheet = ss.getSheetByName(ABA_VINCULOS);

    const usuariosExistentes = respSheet.getDataRange().getValues().slice(1).map(r => r[2]);
    const usuario = gerarUsuario_(nome, usuariosExistentes);
    const respId = proximoId_(respSheet, 'R');
    const celulaSenha = codificarSenha_(senha);

    respSheet.appendRow([respId, nome, usuario, celulaSenha, email, celular, false]);

    filhos.forEach(function (filho) {
      const criancaId = proximoId_(criancaSheet, 'C');
      criancaSheet.appendRow([criancaId, filho.nome, filho.funcao]);
      vincSheet.appendRow([respId, criancaId]);
    });

    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Cadastro realizado — Escala de Coroinhas e Cerimoniários',
        body: 'Olá, ' + nome + '!\n\n' +
          'Seu cadastro na escala de coroinhas e cerimoniários da ' + PARÓQUIA.nome + ' foi realizado com sucesso.\n\n' +
          'Seu usuário de acesso é: ' + usuario + '\n' +
          'Guarde esse usuário — você vai usá-lo para entrar no app junto com a senha que cadastrou.\n\n' +
          'Acesse pelo link: ' + urlDoApp_() + '\n\n' +
          PARÓQUIA.nome + '\n' + PARÓQUIA.endereco + '\n' + PARÓQUIA.telefone
      });
    } catch (err) {
      // não bloqueia o cadastro se o envio de e-mail falhar
    }

    const resposta = montarRespostaLogin_({ id: respId, nome: nome, coordenador: false },
      criarSessao_(respId, celulaSenha));
    resposta.usuario = usuario;
    return resposta;
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Recuperação de senha                                                   */
/* ---------------------------------------------------------------------- */

/** Gera um link de redefinição de senha válido por 1 hora e envia por e-mail. */
function solicitarRecuperacaoSenha(usuario) {
  const usuarioBusca = String(usuario === null || usuario === undefined ? '' : usuario).trim().toLowerCase().slice(0, 100);
  // resposta é sempre a mesma: não revela se o usuário existe nem se houve limite
  if (!usuarioBusca) return { sucesso: true };

  const chaveUsuario = chaveLimite_('reset', usuarioBusca);
  if (lerContagem_(chaveUsuario) >= 1) return { sucesso: true };
  if (lerContagem_('rl_reset_global') >= RECUPERACOES_POR_HORA) return { sucesso: true };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dados = ss.getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();

  let encontrado = null;
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][2]).trim().toLowerCase() === usuarioBusca) {
      encontrado = { id: dados[i][0], nome: dados[i][1], email: dados[i][4] };
      break;
    }
  }
  if (!encontrado || !REGEX_EMAIL.test(String(encontrado.email))) return { sucesso: true };

  somarContagem_(chaveUsuario, 120);
  somarContagem_('rl_reset_global', 3600);

  const resetSheet = ss.getSheetByName(ABA_RESET);
  const token = gerarToken_();
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  resetSheet.appendRow([token, encontrado.id, expiraEm, false]);

  const link = urlDoApp_() + '?token=' + token;
  MailApp.sendEmail({
    to: encontrado.email,
    subject: 'Redefinição de senha — Escala de Coroinhas e Cerimoniários',
    body: 'Olá, ' + encontrado.nome + '!\n\n' +
      'Recebemos um pedido para redefinir sua senha. Clique no link abaixo (válido por 1 hora):\n\n' +
      link + '\n\n' +
      'Se você não pediu isso, pode ignorar este e-mail.\n\n' +
      PARÓQUIA.nome
  });

  return { sucesso: true };
}

/** Valida o token de redefinição e troca a senha. */
function redefinirSenha(token, novaSenha) {
  token = String(token === null || token === undefined ? '' : token);
  novaSenha = String(novaSenha === null || novaSenha === undefined ? '' : novaSenha).trim();
  if (!REGEX_TOKEN_RESET.test(token)) return { sucesso: false, mensagem: 'Link inválido.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const resetSheet = ss.getSheetByName(ABA_RESET);
    const dados = resetSheet.getDataRange().getValues();

    for (let i = 1; i < dados.length; i++) {
      const [tk, responsavelId, expiraEm, usado] = dados[i];
      if (String(tk) !== token) continue;

      if (ehVerdadeiro_(usado)) {
        return { sucesso: false, mensagem: 'Esse link já foi utilizado. Solicite um novo.' };
      }
      if (new Date(expiraEm) < new Date()) {
        return { sucesso: false, mensagem: 'Esse link expirou. Solicite um novo.' };
      }
      if (novaSenha.length < SENHA_MINIMA || novaSenha.length > 100) {
        return { sucesso: false, mensagem: 'A senha deve ter entre ' + SENHA_MINIMA + ' e 100 caracteres.' };
      }

      const respSheet = ss.getSheetByName(ABA_RESPONSAVEIS);
      const respDados = respSheet.getDataRange().getValues();
      for (let j = 1; j < respDados.length; j++) {
        if (String(respDados[j][0]) === String(responsavelId)) {
          respSheet.getRange(j + 1, 4).setValue(codificarSenha_(novaSenha));
          break;
        }
      }
      resetSheet.getRange(i + 1, 4).setValue(true);
      return { sucesso: true };
    }
    return { sucesso: false, mensagem: 'Link inválido.' };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Missas — visão dos responsáveis                                        */
/* ---------------------------------------------------------------------- */

function lerMissasBrutas_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
  const dados = sheet.getDataRange().getValues();
  const agora = new Date();

  const partir = v => v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : [];
  const missas = [];
  for (let i = 1; i < dados.length; i++) {
    const [data, horario, descricao, minCoroinha, maxCoroinha, coroinhas,
      minCerim, maxCerim, cerimoniarios] = dados[i];
    if (!data) continue;
    const dataObj = new Date(data);
    if (isNaN(dataObj)) continue;

    // Extrai hora/minuto do campo Horário (pode vir como Date ou texto "HH:mm")
    let horas = 0, minutos = 0, horarioTexto = '';
    if (Object.prototype.toString.call(horario) === '[object Date]' && !isNaN(horario)) {
      horas = horario.getHours();
      minutos = horario.getMinutes();
      horarioTexto = Utilities.formatDate(horario, Session.getScriptTimeZone(), 'HH:mm');
    } else if (horario) {
      const partes = String(horario).split(':');
      horas = Number(partes[0]) || 0;
      minutos = Number(partes[1]) || 0;
      horarioTexto = String(horario);
    }

    // Combina data + horário num instante único para comparar com "agora"
    const dataHora = new Date(dataObj.getFullYear(), dataObj.getMonth(), dataObj.getDate(), horas, minutos);
    if (dataHora < agora) continue; // já passou, mesmo que seja hoje

    missas.push({
      linha: i + 1,
      data: Utilities.formatDate(dataObj, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      diaSemana: Utilities.formatDate(dataObj, Session.getScriptTimeZone(), 'EEEE'),
      dataOrdenacao: dataHora.getTime(),
      horario: horarioTexto,
      descricao: descricao,
      minCoroinha: Number(minCoroinha) || 0,
      maxCoroinha: Number(maxCoroinha) || 0,
      coroinhas: partir(coroinhas),
      minCerimoniario: Number(minCerim) || 0,
      maxCerimoniario: Number(maxCerim) || 0,
      cerimoniarios: partir(cerimoniarios)
    });
  }
  missas.sort((a, b) => a.dataOrdenacao - b.dataOrdenacao);
  return missas;
}

function listarMissas(sessao) {
  autenticar_(sessao);
  return lerMissasBrutas_();
}

/** Confere se a criança existe, se a função confere e se quem chama pode mexer nela. */
function validarAlvoEscala_(u, criancaId, funcao) {
  if (FUNCOES_VALIDAS.indexOf(funcao) === -1) return { sucesso: false, mensagem: 'Função inválida.' };
  criancaId = String(criancaId === null || criancaId === undefined ? '' : criancaId);

  if (!u.coordenador && !criancaDoResponsavel_(u.id, criancaId)) throw new Error('SEM_PERMISSAO');

  const crianca = mapaCriancas_()[criancaId];
  const norm = s => removerAcentos_(String(s === null || s === undefined ? '' : s)).trim().toLowerCase();
  if (!crianca || norm(crianca.funcao) !== norm(funcao)) {
    return { sucesso: false, mensagem: 'Criança ou função inválida.' };
  }
  return null;
}

function inscrever(sessao, linha, criancaId, funcao) {
  const u = autenticar_(sessao);
  linha = Number(linha);
  const erro = validarAlvoEscala_(u, criancaId, funcao);
  if (erro) return erro;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
    if (!linhaValida_(sheet, linha)) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    const colVagas = funcao === 'Coroinha' ? 5 : 8;
    const colLista = funcao === 'Coroinha' ? 6 : 9;

    const vagas = Number(sheet.getRange(linha, colVagas).getValue()) || 0;
    const atual = sheet.getRange(linha, colLista).getValue();
    const ids = atual ? String(atual).split(',').map(s => s.trim()).filter(Boolean) : [];

    if (ids.includes(String(criancaId))) {
      return { sucesso: false, mensagem: 'Essa criança já está escalada nessa missa.' };
    }
    if (ids.length >= vagas) {
      return { sucesso: false, mensagem: 'Não há mais vagas para essa função nessa missa.' };
    }

    ids.push(String(criancaId));
    sheet.getRange(linha, colLista).setValue(ids.join(', '));
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

function cancelar(sessao, linha, criancaId, funcao) {
  const u = autenticar_(sessao);
  linha = Number(linha);
  const erro = validarAlvoEscala_(u, criancaId, funcao);
  if (erro) return erro;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
    if (!linhaValida_(sheet, linha)) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    const colLista = funcao === 'Coroinha' ? 6 : 9;

    const atual = sheet.getRange(linha, colLista).getValue();
    let ids = atual ? String(atual).split(',').map(s => s.trim()).filter(Boolean) : [];
    ids = ids.filter(id => id !== String(criancaId));
    sheet.getRange(linha, colLista).setValue(ids.join(', '));
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Painel do coordenador (todas exigem sessão de coordenador)             */
/* ---------------------------------------------------------------------- */

function mapaCriancas_() {
  const dados = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_CRIANCAS).getDataRange().getValues();
  const mapa = {};
  for (let i = 1; i < dados.length; i++) {
    const [id, nome, funcao] = dados[i];
    if (id) mapa[id] = { nome, funcao };
  }
  return mapa;
}

/** Lista todas as crianças cadastradas (uso do coordenador, para escalar manualmente). */
function listarCriancas(sessao) {
  exigirCoordenador_(sessao);
  const dados = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_CRIANCAS).getDataRange().getValues();
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    const [id, nome, funcao] = dados[i];
    if (id) lista.push({ id: id, nome: nome, funcao: funcao });
  }
  lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
  return lista;
}

/** Como listarMissas(), mas com nomes das crianças resolvidos. */
function listarMissasParaCoordenador(sessao) {
  exigirCoordenador_(sessao);
  const missas = lerMissasBrutas_();
  const criancas = mapaCriancas_();

  return missas.map(function (m) {
    return Object.assign({}, m, {
      coroinhasNomes: m.coroinhas.map(id => (criancas[id] ? criancas[id].nome : '(?)')),
      cerimoniariosNomes: m.cerimoniarios.map(id => (criancas[id] ? criancas[id].nome : '(?)')),
      abaixoMinCoroinha: m.coroinhas.length < m.minCoroinha,
      abaixoMinCerimoniario: m.cerimoniarios.length < m.minCerimoniario
    });
  });
}

function obterResumoCoordenador(sessao) {
  exigirCoordenador_(sessao);
  const missas = lerMissasBrutas_(); // já vem só com futuras, ordenadas
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const respDados = ss.getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();
  const totalResponsaveis = Math.max(0, respDados.length - 1);

  const criancasDados = ss.getSheetByName(ABA_CRIANCAS).getDataRange().getValues();
  let totalCoroinhas = 0, totalCerimoniarios = 0;
  for (let i = 1; i < criancasDados.length; i++) {
    const funcao = criancasDados[i][2];
    if (funcao === 'Coroinha') totalCoroinhas++;
    else if (funcao === 'Cerimoniário') totalCerimoniarios++;
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const em7dias = new Date(hoje); em7dias.setDate(em7dias.getDate() + 7); em7dias.setHours(23, 59, 59, 999);
  const em3dias = new Date(hoje); em3dias.setDate(em3dias.getDate() + 3); em3dias.setHours(23, 59, 59, 999);

  let totalMissasAbaixoMin = 0;
  let vagasAbertas7dias = 0;
  let somaEscalados = 0, somaMax = 0;
  let proximaMissa = null;
  const alertasUrgentes = [];

  missas.forEach(function (m) {
    const dataObj = new Date(m.dataOrdenacao);
    const abaixoMin = (m.coroinhas.length < m.minCoroinha) || (m.cerimoniarios.length < m.minCerimoniario);
    if (abaixoMin) totalMissasAbaixoMin++;

    somaEscalados += m.coroinhas.length + m.cerimoniarios.length;
    somaMax += m.maxCoroinha + m.maxCerimoniario;

    if (dataObj <= em7dias) {
      vagasAbertas7dias += Math.max(0, m.maxCoroinha - m.coroinhas.length) +
        Math.max(0, m.maxCerimoniario - m.cerimoniarios.length);
    }

    if (!proximaMissa) {
      proximaMissa = {
        data: m.data, horario: m.horario, diaSemana: m.diaSemana, descricao: m.descricao,
        coroinhas: m.coroinhas.length, minCoroinha: m.minCoroinha, maxCoroinha: m.maxCoroinha,
        cerimoniarios: m.cerimoniarios.length, minCerimoniario: m.minCerimoniario, maxCerimoniario: m.maxCerimoniario
      };
    }

    if (dataObj <= em3dias) {
      const totalEscalado = m.coroinhas.length + m.cerimoniarios.length;
      const totalMax = m.maxCoroinha + m.maxCerimoniario;
      const ocupacao = totalMax > 0 ? totalEscalado / totalMax : 1;
      if (ocupacao < 0.5) {
        alertasUrgentes.push({
          linha: m.linha,
          data: m.data, horario: m.horario, diaSemana: m.diaSemana,
          coroinhas: m.coroinhas.length, maxCoroinha: m.maxCoroinha,
          cerimoniarios: m.cerimoniarios.length, maxCerimoniario: m.maxCerimoniario,
          ocupacaoPct: Math.round(ocupacao * 100)
        });
      }
    }
  });

  return {
    totalMissasAbaixoMin: totalMissasAbaixoMin,
    proximaMissa: proximaMissa,
    vagasAbertas7dias: vagasAbertas7dias,
    totalCoroinhas: totalCoroinhas,
    totalCerimoniarios: totalCerimoniarios,
    totalResponsaveis: totalResponsaveis,
    taxaOcupacao: somaMax > 0 ? Math.round((somaEscalados / somaMax) * 100) : 0,
    alertasUrgentes: alertasUrgentes
  };
}

function montarMensagemChamada_(dados) {
  const descricaoTexto = dados.descricao ? (' (' + dados.descricao + ')') : '';
  return TEMPLATE_MENSAGEM_CHAMADA
    .replace('{responsavel}', () => dados.responsavel)
    .replace('{funcao}', () => dados.funcao)
    .replace('{diaSemana}', () => dados.diaSemana)
    .replace('{data}', () => dados.data)
    .replace('{horario}', () => dados.horario)
    .replace('{descricaoTexto}', () => descricaoTexto)
    .replace('{crianca}', () => dados.crianca)
    .replace('{paroquia}', () => PARÓQUIA.nome);
}

function formatarTelefoneWhatsApp_(celular) {
  if (!celular) return null;
  let digitos = String(celular).replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 10 || digitos.length === 11) {
    digitos = '55' + digitos; // DDD + número, sem DDI
  } else if (!digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    digitos = '55' + digitos;
  }
  return digitos;
}

/** Lista responsáveis de crianças da função X que estão livres (sem nenhuma missa futura), com link do WhatsApp pronto. */
function obterResponsaveisParaChamar(sessao, linha, funcao) {
  exigirCoordenador_(sessao);
  linha = Number(linha);
  if (FUNCOES_VALIDAS.indexOf(funcao) === -1) return [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const missas = lerMissasBrutas_();
  const missa = missas.find(function (m) { return m.linha === linha; });
  if (!missa) return [];

  const escaladosEmAlgumaMissa = {};
  missas.forEach(function (m) {
    m.coroinhas.forEach(function (id) { escaladosEmAlgumaMissa[id] = true; });
    m.cerimoniarios.forEach(function (id) { escaladosEmAlgumaMissa[id] = true; });
  });

  const criancasDados = ss.getSheetByName(ABA_CRIANCAS).getDataRange().getValues();
  const criancasLivres = [];
  for (let i = 1; i < criancasDados.length; i++) {
    const [id, nome, funcaoCrianca] = criancasDados[i];
    if (funcaoCrianca === funcao && id && !escaladosEmAlgumaMissa[id]) {
      criancasLivres.push({ id: id, nome: nome });
    }
  }

  const vinculos = ss.getSheetByName(ABA_VINCULOS).getDataRange().getValues();
  const respDados = ss.getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();
  const respPorId = {};
  for (let i = 1; i < respDados.length; i++) {
    const [id, nome, usuario, senha, email, celular] = respDados[i];
    respPorId[id] = { nome: nome, celular: celular };
  }

  const resultado = [];
  criancasLivres.forEach(function (crianca) {
    for (let i = 1; i < vinculos.length; i++) {
      const [responsavelId, criancaId] = vinculos[i];
      if (String(criancaId) !== String(crianca.id)) continue;
      const resp = respPorId[responsavelId];
      if (!resp) continue;

      const telefone = formatarTelefoneWhatsApp_(resp.celular);
      const item = {
        criancaNome: crianca.nome,
        responsavelNome: resp.nome,
        semCelular: !telefone
      };
      if (telefone) {
        const mensagem = montarMensagemChamada_({
          responsavel: resp.nome, funcao: funcao, diaSemana: missa.diaSemana,
          data: missa.data, horario: missa.horario, descricao: missa.descricao,
          crianca: crianca.nome
        });
        item.link = 'https://api.whatsapp.com/send/?phone=' + telefone +
          '&text=' + encodeURIComponent(mensagem) + '&type=phone_number&app_absent=0';
      }
      resultado.push(item);
    }
  });
  return resultado;
}

/** Cria missas recorrentes semanais a partir de hoje. */
function gerarMissasRecorrentes(sessao, config) {
  exigirCoordenador_(sessao);
  config = config || {};

  const diaIndex = DIAS_SEMANA.indexOf(config.diaSemana);
  if (diaIndex === -1) return { sucesso: false, mensagem: 'Dia da semana inválido.' };
  const horario = String(config.horario || '');
  if (!REGEX_HORARIO.test(horario)) return { sucesso: false, mensagem: 'Horário inválido.' };

  const minC = numeroLimitado_(config.minCoroinha, 50);
  const maxC = numeroLimitado_(config.maxCoroinha, 50);
  const minCe = numeroLimitado_(config.minCerimoniario, 50);
  const maxCe = numeroLimitado_(config.maxCerimoniario, 50);
  if (minC > maxC || minCe > maxCe) return { sucesso: false, mensagem: 'O mínimo não pode ser maior que o máximo.' };

  const descricao = limparTexto_(config.descricao, 100);
  const semanas = Math.min(52, Math.max(1, Math.floor(Number(config.semanas)) || 1));

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let proxima = new Date(hoje);
    while (proxima.getDay() !== diaIndex) {
      proxima.setDate(proxima.getDate() + 1);
    }

    let criadas = 0;
    for (let i = 0; i < semanas; i++) {
      const data = new Date(proxima);
      data.setDate(data.getDate() + i * 7);
      sheet.appendRow([data, horario, descricao, minC, maxC, '', minCe, maxCe, '']);
      criadas++;
    }
    return { sucesso: true, criadas: criadas };
  } finally {
    lock.releaseLock();
  }
}

function editarMissa(sessao, linha, dados) {
  exigirCoordenador_(sessao);
  linha = Number(linha);
  dados = dados || {};

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
    if (!linhaValida_(sheet, linha)) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    if (dados.horario) {
      if (!REGEX_HORARIO.test(String(dados.horario))) return { sucesso: false, mensagem: 'Horário inválido.' };
      sheet.getRange(linha, 2).setValue(String(dados.horario));
    }
    if (dados.descricao !== undefined) sheet.getRange(linha, 3).setValue(limparTexto_(dados.descricao, 100));
    if (dados.minCoroinha !== undefined) sheet.getRange(linha, 4).setValue(numeroLimitado_(dados.minCoroinha, 50));
    if (dados.maxCoroinha !== undefined) sheet.getRange(linha, 5).setValue(numeroLimitado_(dados.maxCoroinha, 50));
    if (dados.minCerimoniario !== undefined) sheet.getRange(linha, 7).setValue(numeroLimitado_(dados.minCerimoniario, 50));
    if (dados.maxCerimoniario !== undefined) sheet.getRange(linha, 8).setValue(numeroLimitado_(dados.maxCerimoniario, 50));
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/** dataEsperada ("dd/MM/yyyy") garante que a linha ainda é a missa que o coordenador viu. */
function excluirMissa(sessao, linha, dataEsperada) {
  exigirCoordenador_(sessao);
  linha = Number(linha);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
    if (!linhaValida_(sheet, linha)) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    const dataLinha = new Date(sheet.getRange(linha, 1).getValue());
    const dataTxt = isNaN(dataLinha) ? '' : Utilities.formatDate(dataLinha, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    if (dataEsperada && dataTxt !== String(dataEsperada)) {
      return { sucesso: false, mensagem: 'A lista mudou desde que você abriu. Atualize e tente de novo.' };
    }

    sheet.deleteRow(linha);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Lembretes por e-mail                                                   */
/* ---------------------------------------------------------------------- */

/** Rode uma vez para criar o gatilho diário automático (09h). */
function criarGatilhoDiario() {
  exigirAdmin_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarLembretes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('enviarLembretes').timeBased().everyDays(1).atHour(9).create();
}

/**
 * Entrada do gatilho diário. Como qualquer pessoa conseguiria chamar esta função pelo
 * navegador, ela só envia uma vez por dia (chamadas repetidas no mesmo dia são ignoradas).
 */
function enviarLembretes() {
  const props = PropertiesService.getScriptProperties();
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (props.getProperty('ULTIMO_LEMBRETE') === hoje) return { sucesso: true, avisados: 0, repetido: true };
  props.setProperty('ULTIMO_LEMBRETE', hoje);
  return enviarLembretes_();
}

/** Botão "Enviar lembretes agora" do painel (só coordenador). */
function enviarLembretesCoordenador(sessao) {
  exigirCoordenador_(sessao);
  return enviarLembretes_();
}

/** Envia lembretes das missas de daqui a 3 dias. */
function enviarLembretes_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const missas = ss.getSheetByName(ABA_MISSAS).getDataRange().getValues();
  const criancas = mapaCriancas_();
  const vinculos = ss.getSheetByName(ABA_VINCULOS).getDataRange().getValues();
  const responsaveis = ss.getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();

  const responsavelPorId = {};
  const coordenadores = [];
  for (let i = 1; i < responsaveis.length; i++) {
    const [id, nome, usuario, senha, email, celular, coordenador] = responsaveis[i];
    responsavelPorId[id] = { nome, email };
    if (ehVerdadeiro_(coordenador)) {
      coordenadores.push({ nome, email });
    }
  }

  const responsaveisPorCrianca = {};
  for (let i = 1; i < vinculos.length; i++) {
    const [responsavelId, criancaId] = vinculos[i];
    if (!responsaveisPorCrianca[criancaId]) responsaveisPorCrianca[criancaId] = [];
    responsaveisPorCrianca[criancaId].push(responsavelId);
  }

  const alvo = new Date();
  alvo.setDate(alvo.getDate() + 3);
  alvo.setHours(0, 0, 0, 0);
  const alvoStr = Utilities.formatDate(alvo, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const partir = v => v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : [];

  const porResponsavel = {}; // responsavelId -> [{criancaNome, funcao, data, horario}]
  const escalaCompleta = []; // para o e-mail do coordenador

  for (let i = 1; i < missas.length; i++) {
    const [data, horario, descricao, minC, maxC, coroinhas, minCe, maxCe, cerimoniarios] = missas[i];
    if (!data) continue;
    const dataObj = new Date(data);
    const dataStr = Utilities.formatDate(dataObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (dataStr !== alvoStr) continue;

    const dataFormatada = Utilities.formatDate(dataObj, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    const idsCoroinha = partir(coroinhas);
    const idsCerim = partir(cerimoniarios);

    const linhaEscala = { data: dataFormatada, horario, descricao,
      coroinhas: idsCoroinha.map(id => (criancas[id] ? criancas[id].nome : '(?)')),
      cerimoniarios: idsCerim.map(id => (criancas[id] ? criancas[id].nome : '(?)')) };
    escalaCompleta.push(linhaEscala);

    function processar(ids, funcao) {
      ids.forEach(function (criancaId) {
        const nomeCrianca = criancas[criancaId] ? criancas[criancaId].nome : '(?)';
        (responsaveisPorCrianca[criancaId] || []).forEach(function (respId) {
          if (!porResponsavel[respId]) porResponsavel[respId] = [];
          porResponsavel[respId].push({ criancaNome: nomeCrianca, funcao: funcao, data: dataFormatada, horario: horario });
        });
      });
    }
    processar(idsCoroinha, 'Coroinha');
    processar(idsCerim, 'Cerimoniário');
  }

  Object.keys(porResponsavel).forEach(function (respId) {
    const resp = responsavelPorId[respId];
    if (!resp || !resp.email) return;
    const itens = porResponsavel[respId];
    const corpo = itens.map(it => '- ' + it.criancaNome + ' (' + it.funcao + '), ' + it.data + ' às ' + it.horario).join('\n');
    MailApp.sendEmail({
      to: resp.email,
      subject: 'Lembrete: escala em 3 dias — ' + PARÓQUIA.nome,
      body: 'Olá, ' + resp.nome + '!\n\nLembrando que:\n\n' + corpo +
        '\n\n' + PARÓQUIA.nome + '\n' + PARÓQUIA.endereco + '\n' + PARÓQUIA.telefone
    });
  });

  if (escalaCompleta.length > 0) {
    const corpoCompleto = escalaCompleta.map(function (m) {
      return m.data + ' às ' + m.horario + (m.descricao ? ' - ' + m.descricao : '') +
        '\n  Coroinhas: ' + (m.coroinhas.join(', ') || '(nenhum)') +
        '\n  Cerimoniários: ' + (m.cerimoniarios.join(', ') || '(nenhum)');
    }).join('\n\n');

    coordenadores.forEach(function (c) {
      if (!c.email) return;
      MailApp.sendEmail({
        to: c.email,
        subject: 'Escala completa — daqui a 3 dias — ' + PARÓQUIA.nome,
        body: 'Olá, ' + c.nome + '!\n\nEscala completa das missas de daqui a 3 dias:\n\n' + corpoCompleto +
          '\n\n' + PARÓQUIA.nome
      });
    });
  }

  return { sucesso: true, avisados: Object.keys(porResponsavel).length };
}

/* ---------------------------------------------------------------------- */
/* Ferramentas de teste (bloqueadas em produção — ver exigirAdmin_)       */
/* ---------------------------------------------------------------------- */

function testeMissas() {
  exigirAdmin_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ABA_MISSAS);
  Logger.log('Aba encontrada: %s', sheet ? sheet.getName() : 'NULL - nome não bate!');
  if (!sheet) return;
  const dados = sheet.getDataRange().getValues();
  Logger.log('Linhas: %s', dados.length);
  Logger.log(JSON.stringify(dados));
  try {
    Logger.log(JSON.stringify(lerMissasBrutas_()));
  } catch (e) {
    Logger.log('ERRO em lerMissasBrutas_: ' + e.message);
  }
}

/** Gera dados de teste para Vinculos e Missas a partir do que já existe em Responsaveis e Criancas.
 *  DESTRUTIVO: limpa Vinculos e Missas. Roda uma vez pelo editor do Apps Script. */
function gerarDadosTeste() {
  exigirAdmin_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const respSheet = ss.getSheetByName(ABA_RESPONSAVEIS);
  const criancaSheet = ss.getSheetByName(ABA_CRIANCAS);
  const vincSheet = ss.getSheetByName(ABA_VINCULOS);
  const missaSheet = ss.getSheetByName(ABA_MISSAS);

  const respDados = respSheet.getDataRange().getValues();
  const criancaDados = criancaSheet.getDataRange().getValues();

  const responsaveisIds = [];
  for (let i = 1; i < respDados.length; i++) {
    if (respDados[i][0]) responsaveisIds.push(respDados[i][0]);
  }

  const coroinhas = [];
  const cerimoniarios = [];
  for (let i = 1; i < criancaDados.length; i++) {
    const [id, nome, funcao] = criancaDados[i];
    if (!id) continue;
    if (funcao === 'Coroinha') coroinhas.push(id);
    else if (funcao === 'Cerimoniário') cerimoniarios.push(id);
  }

  if (responsaveisIds.length === 0 || (coroinhas.length + cerimoniarios.length) === 0) {
    Logger.log('Cadastre Responsaveis e Criancas antes de rodar esse gerador.');
    return;
  }

  /* ---------- Limpa dados antigos (mantém cabeçalho) ---------- */
  if (vincSheet.getLastRow() > 1) vincSheet.getRange(2, 1, vincSheet.getLastRow() - 1, 2).clearContent();
  if (missaSheet.getLastRow() > 1) missaSheet.getRange(2, 1, missaSheet.getLastRow() - 1, 9).clearContent();

  /* ---------- Gera Vínculos ---------- */
  const todasCriancas = coroinhas.concat(cerimoniarios);
  const novosVinculos = [];
  let idxResp = 0;

  todasCriancas.forEach(function (criancaId, i) {
    const respId = responsaveisIds[idxResp % responsaveisIds.length];
    novosVinculos.push([respId, criancaId]);

    // a cada 5 crianças, dá 2 filhos pro mesmo responsável (simula irmãos)
    if (i % 5 === 4 && i + 1 < todasCriancas.length) {
      // não avança o índice, próxima criança pega o mesmo responsável no próximo loop
    } else {
      idxResp++;
    }
  });

  // caso especial: primeira criança tem 2 responsáveis (pais separados)
  if (todasCriancas.length > 0 && responsaveisIds.length > 1) {
    novosVinculos.push([responsaveisIds[responsaveisIds.length - 1], todasCriancas[0]]);
  }

  if (novosVinculos.length > 0) {
    vincSheet.getRange(2, 1, novosVinculos.length, 2).setValues(novosVinculos);
  }

  /* ---------- Gera Missas ---------- */
  const novasMissas = [];

  function proximoDomingo(diasAFrente) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + diasAFrente);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    return d;
  }

  function horaComo(dataBase, hh, mm) {
    const d = new Date(dataBase);
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  function idsAleatorios(lista, qtd) {
    const copia = lista.slice();
    const escolhidos = [];
    for (let i = 0; i < qtd && copia.length > 0; i++) {
      const idx = Math.floor(Math.random() * copia.length);
      escolhidos.push(copia.splice(idx, 1)[0]);
    }
    return escolhidos;
  }

  // Cenário 1: missa daqui a 2 dias, quase vazia (dispara alerta de WhatsApp)
  const dataUrgente = new Date(); dataUrgente.setDate(dataUrgente.getDate() + 2); dataUrgente.setHours(0, 0, 0, 0);
  novasMissas.push([
    horaComo(dataUrgente, 19, 0), horaComo(dataUrgente, 19, 0), 'Missa Dominical (teste: urgente)',
    3, 6, idsAleatorios(coroinhas, 1).join(', '),
    2, 4, idsAleatorios(cerimoniarios, 1).join(', ')
  ]);

  // Cenário 2: próximo domingo, abaixo do mínimo (mas não urgente)
  const dom1 = proximoDomingo(3);
  novasMissas.push([
    dom1, horaComo(dom1, 10, 0), 'Missa Dominical (teste: abaixo do mínimo)',
    4, 8, idsAleatorios(coroinhas, 1).join(', '),
    3, 5, idsAleatorios(cerimoniarios, 1).join(', ')
  ]);

  // Cenário 3: missa cheia (limite atingido)
  novasMissas.push([
    dom1, horaComo(dom1, 19, 0), 'Missa Dominical (teste: cheia)',
    2, 3, idsAleatorios(coroinhas, Math.min(3, coroinhas.length)).join(', '),
    1, 2, idsAleatorios(cerimoniarios, Math.min(2, cerimoniarios.length)).join(', ')
  ]);

  // Cenário 4: missa totalmente vazia
  const dom2 = proximoDomingo(10);
  novasMissas.push([
    dom2, horaComo(dom2, 10, 0), 'Missa Dominical (teste: vazia)',
    3, 6, '',
    2, 4, ''
  ]);

  // Cenário 5-8: missas normais nas próximas semanas, com ocupação parcial variada
  for (let semana = 2; semana <= 5; semana++) {
    const dom = proximoDomingo(semana * 7);
    novasMissas.push([
      dom, horaComo(dom, 19, 0), 'Missa Dominical',
      3, 6, idsAleatorios(coroinhas, Math.min(2, coroinhas.length)).join(', '),
      2, 4, idsAleatorios(cerimoniarios, Math.min(2, cerimoniarios.length)).join(', ')
    ]);
  }

  if (novasMissas.length > 0) {
    missaSheet.getRange(2, 1, novasMissas.length, 9).setValues(novasMissas);
  }

  Logger.log('Gerados: %s vínculos, %s missas.', novosVinculos.length, novasMissas.length);
  Logger.log('Cenários criados: 1 missa urgente/vazia (WhatsApp), 1 abaixo do mínimo, 1 cheia, 1 totalmente vazia, 4 normais.');
}
