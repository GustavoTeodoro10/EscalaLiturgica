/**
 * Escala Litúrgica: pastorais que servem nas missas. Paróquia São Vicente de Paulo (Mauá-SP)
 * ---------------------------------------------------------------------------------
 * Modelo (rode migrarParaMultiPastoral() uma vez para criar/converter as abas):
 *
 *  "Responsaveis" -> ID | Nome | Usuario | Senha | Email | Celular | Coordenador (antigo) | Administrador | Nascimento
 *  "Criancas"     -> ID | Nome | Funcao (antigo) | Tipo (crianca/adulto) | Nascimento   (cadastro de pessoas)
 *  "Vinculos"     -> ResponsavelID | CriancaID                                (para adultos, o próprio)
 *  "Pastorais"    -> ID | Nome | CoordenadorID | Ativa | ExigeResponsavel
 *  "Funcoes"      -> ID | PastoralID | Nome | MinPadrao | MaxPadrao
 *  "Membros"      -> PessoaID | PastoralID | FuncaoID | Situacao (ativo/pendente)
 *  "Eventos"      -> ID | Data | Horario | Descricao                          (a missa existe uma vez)
 *  "Vagas"        -> EventoID | FuncaoID | Minimo | Maximo | Escalados        (sem linha = padrão da função)
 *  "ResetSenha"   -> Token | ResponsavelID | ExpiraEm | Usado
 *  "Missas"       -> aba antiga (só leitura, usada na migração)
 *
 * PERFIS: administrador (cria missas e pastorais), coordenador (gerencia a própria pastoral) e
 * responsável/membro. Detalhes em docs/MULTI-PASTORAL-CONTRATO.md.
 *
 * SEGURANÇA
 *  - Toda função chamável pelo navegador recebe o token de sessão e valida no servidor.
 *  - Funções cujo nome termina com "_" são internas: o Apps Script NÃO as expõe ao navegador.
 *  - Senhas ficam com hash (formato h1$salt$hash). Senhas antigas em texto puro são
 *    convertidas automaticamente no próximo login de cada pessoa.
 *  - Funções administrativas (configurarPlanilha, migrarParaMultiPastoral, criarGatilhoDiario,
 *    testeMissas) só rodam se a propriedade de script PERMITIR_ADMIN = sim existir.
 */

const ABA_RESPONSAVEIS = 'Responsaveis';
const ABA_CRIANCAS = 'Criancas';
const ABA_VINCULOS = 'Vinculos';
const ABA_MISSAS = 'Missas';
const ABA_RESET = 'ResetSenha';
const ABA_PASTORAIS = 'Pastorais';
const ABA_FUNCOES = 'Funcoes';
const ABA_MEMBROS = 'Membros';
const ABA_EVENTOS = 'Eventos';
const ABA_VAGAS = 'Vagas';

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
// Nome por extenso, para mensagens. Não usar formatDate(..., 'EEEE'): o Apps Script devolve em inglês.
const NOMES_DIA_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const PARÓQUIA = {
  nome: 'Paróquia São Vicente de Paulo',
  endereco: 'R. Vice-Presidente Francisco Silviano Alves Brandão, 88 - Parque São Vicente, Mauá - SP, 09371-160',
  telefone: '(11) 4555-4205'
};

const TEMPLATE_MENSAGEM_CHAMADA =
  'Olá, {responsavel}! Está faltando gente pra servir como {funcao} na pastoral {pastoral} na missa de {diaSemana}, {data} às {horario}{descricaoTexto}. {pessoa} pode ajudar? Qualquer confirmação, me avisa por aqui.\n\n— {paroquia}';

/* Segurança */
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
  const link = urlBaseAppNovo_();
  const corpo = link
    ? '<p>Abra o aplicativo: <a href="' + link + '">' + link + '</a></p>'
    : '<p>Este endereço é a API do aplicativo. Use o link do aplicativo enviado pela paróquia.</p>';
  return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<body style="font-family:sans-serif;padding:24px"><h3>Escala Litúrgica</h3>' + corpo + '</body>')
    .setTitle('Escala Litúrgica');
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
  // sem sessão
  validarLogin: validarLogin,
  validarSessao: validarSessao,
  cadastrarResponsavel: cadastrarResponsavel,
  listarPastoraisPublico: listarPastoraisPublico,
  solicitarRecuperacaoSenha: solicitarRecuperacaoSenha,
  redefinirSenha: redefinirSenha,
  // responsável / membro
  listarMissas: listarMissas,
  inscrever: inscrever,
  cancelar: cancelar,
  solicitarEntrada: solicitarEntrada,
  // coordenador da pastoral
  listarMissasParaCoordenador: listarMissasParaCoordenador,
  obterResumoCoordenador: obterResumoCoordenador,
  listarMembros: listarMembros,
  decidirEntrada: decidirEntrada,
  removerMembro: removerMembro,
  ajustarVagas: ajustarVagas,
  obterResponsaveisParaChamar: obterResponsaveisParaChamar,
  enviarLembretesCoordenador: enviarLembretesCoordenador,
  // administrador
  obterAdministracao: obterAdministracao,
  criarPastoral: criarPastoral,
  editarPastoral: editarPastoral,
  criarMissa: criarMissa,
  gerarMissasRecorrentes: gerarMissasRecorrentes,
  editarMissa: editarMissa,
  excluirMissa: excluirMissa
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

/**
 * Planilha nova (vazia): cria todas as abas e um administrador de exemplo.
 * Planilha que já tem dados: rode migrarParaMultiPastoral().
 */
function configurarPlanilha() {
  exigirAdmin_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resp = abaOuNova_(ss, ABA_RESPONSAVEIS, ['ID', 'Nome', 'Usuario', 'Senha', 'Email', 'Celular', 'Coordenador', 'Administrador', 'Nascimento']);
  if (resp.getLastRow() === 1) {
    resp.appendRow(['R001', 'Administrador Exemplo', 'Administrador.Exemplo', codificarSenha_('troque-esta-senha'),
      'admin@exemplo.com', '(11) 90000-0000', false, true]);
  }
  abaOuNova_(ss, ABA_CRIANCAS, ['ID', 'Nome', 'Funcao', 'Tipo', 'Nascimento']);
  abaOuNova_(ss, ABA_VINCULOS, ['ResponsavelID', 'CriancaID']);
  abaOuNova_(ss, ABA_RESET, ['Token', 'ResponsavelID', 'ExpiraEm', 'Usado']);
  abaOuNova_(ss, ABA_PASTORAIS, ['ID', 'Nome', 'CoordenadorID', 'Ativa', 'ExigeResponsavel']);
  abaOuNova_(ss, ABA_FUNCOES, ['ID', 'PastoralID', 'Nome', 'MinPadrao', 'MaxPadrao']);
  abaOuNova_(ss, ABA_MEMBROS, ['PessoaID', 'PastoralID', 'FuncaoID', 'Situacao']);
  abaOuNova_(ss, ABA_EVENTOS, ['ID', 'Data', 'Horario', 'Descricao']);
  abaOuNova_(ss, ABA_VAGAS, ['EventoID', 'FuncaoID', 'Minimo', 'Maximo', 'Escalados']);
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

/** Dia da semana em português. O padrão 'u' do formatDate vai de 1 (segunda) a 7 (domingo). */
function nomeDiaSemana_(data) {
  const n = Number(Utilities.formatDate(data, Session.getScriptTimeZone(), 'u'));
  return NOMES_DIA_SEMANA[n % 7];
}

function gerarToken_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function urlDoApp_() {
  return ScriptApp.getService().getUrl();
}

/**
 * Endereço do app novo (Expo/web), definido na propriedade de script APP_URL
 * (ex.: https://escala-liturgica.vercel.app). Sem ela, os e-mails continuam apontando
 * para o app antigo do Apps Script, então nada quebra enquanto o app novo não é publicado.
 */
function urlBaseAppNovo_() {
  const url = String(PropertiesService.getScriptProperties().getProperty('APP_URL') || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(url)) return '';
  return url.replace(/\/+$/, '');
}

/** Link para abrir o app, usado no e-mail de cadastro. */
function urlAcesso_() {
  return urlBaseAppNovo_() || urlDoApp_();
}

/** Link de redefinição de senha enviado por e-mail. */
function linkRedefinicao_(token) {
  const base = urlBaseAppNovo_();
  return base ? base + '/redefinir-senha?token=' + token : urlDoApp_() + '?token=' + token;
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

/** Idade completa em anos de quem nasceu em `nascimento` (Date), contada até `hoje` (Date). */
function idadeEm_(nascimento, hoje) {
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const antes = hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  return antes ? idade - 1 : idade;
}

/**
 * Valida uma data de nascimento 'AAAA-MM-DD'. Devolve { iso } ou { erro: 'obrigatoria'|'invalida'|'futura'|'menor' }.
 * `idadeMinima` (opcional) recusa quem é mais novo que isso.
 */
function validarNascimento_(texto, idadeMinima) {
  const vazio = texto === null || texto === undefined || String(texto).trim() === '';
  if (vazio) return { erro: 'obrigatoria' };
  const data = dataDeTexto_(String(texto).trim());
  if (!data) return { erro: 'invalida' };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (data > hoje) return { erro: 'futura' };
  const idade = idadeEm_(data, hoje);
  if (idade > 110) return { erro: 'invalida' };
  if (idadeMinima && idade < idadeMinima) return { erro: 'menor' };
  return { iso: String(texto).trim() };
}

/** Lê a célula de nascimento (a planilha pode converter o texto em data) e devolve 'AAAA-MM-DD' ou ''. */
function nascimentoDaCelula_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const texto = String(valor === null || valor === undefined ? '' : valor).trim();
  return dataDeTexto_(texto) ? texto : '';
}

/** Idade em anos a partir de 'AAAA-MM-DD', ou null quando não há data. */
function idadeDeNascimento_(iso) {
  const data = iso ? dataDeTexto_(iso) : null;
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, idadeEm_(data, hoje));
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
      administrador: ehVerdadeiro_(dados[i][7]),
      senhaCelula: dados[i][3]
    };
  }
  throw new Error('SESSAO_INVALIDA');
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
    const [id, nome, usr, senhaPlanilha] = dados[i];
    if (String(usr).trim().toLowerCase() !== usuarioBusca) continue;

    const r = conferirSenha_(senhaPlanilha, senhaBusca);
    if (!r.ok) break;

    let celulaSenha = senhaPlanilha;
    if (r.legado) {
      celulaSenha = codificarSenha_(senhaBusca);
      sheet.getRange(i + 1, 4).setValue(celulaSenha);
    }
    CacheService.getScriptCache().remove(chave);

    return montarRespostaLogin_({ id: id, nome: nome, administrador: ehVerdadeiro_(dados[i][7]) },
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
  const pastorais = lerPastorais_().filter(function (p) { return p.ativa; });
  const pastoralPorId = {};
  pastorais.forEach(function (p) { pastoralPorId[p.id] = p; });
  const funcaoPorId = {};
  lerFuncoes_().forEach(function (f) { funcaoPorId[f.id] = f; });
  const pessoasMapa = lerPessoas_();
  const membros = lerMembros_();
  const respId = String(resp.id);

  const pessoas = [];
  lerVinculos_().forEach(function (v) {
    if (v.responsavelId !== respId) return;
    const p = pessoasMapa[v.pessoaId];
    if (!p) return; // vínculo apontando para pessoa removida da planilha
    pessoas.push({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      membros: membros
        .filter(function (m) { return m.pessoaId === p.id && pastoralPorId[m.pastoralId] && funcaoPorId[m.funcaoId]; })
        .map(function (m) {
          return {
            pastoralId: m.pastoralId, pastoral: pastoralPorId[m.pastoralId].nome,
            funcaoId: m.funcaoId, funcao: funcaoPorId[m.funcaoId].nome, situacao: m.situacao
          };
        })
    });
  });

  return {
    sucesso: true,
    token: token,
    responsavelId: respId,
    responsavel: resp.nome,
    administrador: resp.administrador === true,
    pastoraisCoordenadas: pastorais
      .filter(function (p) { return p.coordenadorId === respId; })
      .map(function (p) { return { id: p.id, nome: p.nome }; }),
    pessoas: pessoas
  };
}

/**
 * Cadastra um novo responsável e já retorna logado.
 * dados: { nome, email, celular, senha, nascimento: 'AAAA-MM-DD',
 *          euSirvo: [{ pastoralId, funcaoId }] (aceita também um objeto só) | null,
 *          filhos: [{ nome, nascimento: 'AAAA-MM-DD', pastoralId, funcaoId }] }
 * Toda participação nasce "pendente" até o coordenador da pastoral aprovar.
 */
function cadastrarResponsavel(dados) {
  dados = dados || {};
  const nome = limparTexto_(dados.nome, 80);
  const email = limparTexto_(dados.email, 120).toLowerCase();
  const celular = String(dados.celular === null || dados.celular === undefined ? '' : dados.celular)
    .replace(/[^0-9 ()\-]/g, '').replace(/^[\-\s]+/, '').slice(0, 20);
  const senha = String(dados.senha === null || dados.senha === undefined ? '' : dados.senha).trim();

  if (!nome || !email || !senha) {
    return { sucesso: false, mensagem: 'Preencha nome, e-mail e senha.' };
  }
  if (!REGEX_EMAIL.test(email)) {
    return { sucesso: false, mensagem: 'E-mail inválido.' };
  }
  if (senha.length < SENHA_MINIMA || senha.length > 100) {
    return { sucesso: false, mensagem: 'A senha deve ter entre ' + SENHA_MINIMA + ' e 100 caracteres.' };
  }

  const funcoes = funcoesAtivas_(lerPastorais_(), lerFuncoes_());
  const funcaoValida = function (pastoralId, funcaoId) {
    return funcoes.filter(function (f) {
      return f.id === String(funcaoId) && f.pastoralId === String(pastoralId);
    })[0] || null;
  };

  const nascimento = validarNascimento_(dados.nascimento, 18);
  if (nascimento.erro) {
    const textos = {
      obrigatoria: 'Informe a sua data de nascimento.',
      invalida: 'A sua data de nascimento não é válida.',
      futura: 'A sua data de nascimento não pode ser no futuro.',
      menor: 'O cadastro é do responsável, que precisa ter 18 anos ou mais.'
    };
    return { sucesso: false, mensagem: textos[nascimento.erro] };
  }

  const entradasEu = Array.isArray(dados.euSirvo) ? dados.euSirvo.slice(0, 6) : (dados.euSirvo ? [dados.euSirvo] : []);
  const eu = [];
  for (let i = 0; i < entradasEu.length; i++) {
    const e = entradasEu[i] || {};
    if (!e.funcaoId) continue;
    const funcao = funcaoValida(e.pastoralId, e.funcaoId);
    if (!funcao) return { sucesso: false, mensagem: 'Escolha a pastoral e a função em que você vai servir.' };
    if (!eu.some(function (x) { return x.id === funcao.id; })) eu.push(funcao);
  }

  const filhosEntrada = Array.isArray(dados.filhos) ? dados.filhos.slice(0, 8) : [];
  const filhos = [];
  for (let i = 0; i < filhosEntrada.length; i++) {
    const f = filhosEntrada[i] || {};
    const nomeFilho = limparTexto_(f.nome, 80);
    if (!nomeFilho) continue;
    const funcao = funcaoValida(f.pastoralId, f.funcaoId);
    if (!funcao) return { sucesso: false, mensagem: 'Escolha a pastoral e a função de ' + nomeFilho + '.' };
    const nascFilho = validarNascimento_(f.nascimento);
    if (nascFilho.erro === 'obrigatoria') return { sucesso: false, mensagem: 'Informe a data de nascimento de ' + nomeFilho + '.' };
    if (nascFilho.erro === 'futura') return { sucesso: false, mensagem: 'A data de nascimento de ' + nomeFilho + ' não pode ser no futuro.' };
    if (nascFilho.erro) return { sucesso: false, mensagem: 'A data de nascimento de ' + nomeFilho + ' não é válida.' };
    // o mesmo filho (nome e nascimento) em mais de uma pastoral é uma pessoa só, com várias funções
    const chave = removerAcentos_(nomeFilho).toLowerCase() + '|' + nascFilho.iso;
    const jaTem = filhos.filter(function (x) { return x.chave === chave; })[0];
    if (jaTem) {
      if (!jaTem.funcoes.some(function (x) { return x.id === funcao.id; })) jaTem.funcoes.push(funcao);
    } else {
      filhos.push({ chave: chave, nome: nomeFilho, nascimento: nascFilho.iso, funcoes: [funcao] });
    }
  }

  if (eu.length === 0 && filhos.length === 0) {
    return { sucesso: false, mensagem: 'Informe quem vai servir: você, um filho(a) ou os dois.' };
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
    const pessoaSheet = ss.getSheetByName(ABA_CRIANCAS);
    const vincSheet = ss.getSheetByName(ABA_VINCULOS);
    const membrosSheet = ss.getSheetByName(ABA_MEMBROS);

    const usuariosExistentes = respSheet.getDataRange().getValues().slice(1).map(function (r) { return r[2]; });
    const usuario = gerarUsuario_(nome, usuariosExistentes);
    const respId = proximoId_(respSheet, 'R');
    const celulaSenha = codificarSenha_(senha);

    respSheet.appendRow([respId, nome, usuario, celulaSenha, email, celular, false, false, nascimento.iso]);

    const pedidos = [];
    const adicionarPessoa = function (nomePessoa, tipo, nascimentoPessoa, funcoesDaPessoa) {
      const pessoaId = proximoId_(pessoaSheet, 'C');
      pessoaSheet.appendRow([pessoaId, nomePessoa, '', tipo, nascimentoPessoa]);
      vincSheet.appendRow([respId, pessoaId]);
      funcoesDaPessoa.forEach(function (funcao) {
        membrosSheet.appendRow([pessoaId, funcao.pastoralId, funcao.id, 'pendente']);
        pedidos.push({ pastoralId: funcao.pastoralId, pessoaNome: nomePessoa, funcaoNome: funcao.nome });
      });
    };
    if (eu.length > 0) adicionarPessoa(nome, 'adulto', nascimento.iso, eu);
    filhos.forEach(function (filho) { adicionarPessoa(filho.nome, 'crianca', filho.nascimento, filho.funcoes); });

    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Cadastro realizado — Escala Litúrgica',
        body: 'Olá, ' + nome + '!\n\n' +
          'Seu cadastro na escala litúrgica da ' + PARÓQUIA.nome + ' foi realizado com sucesso.\n\n' +
          'Seu usuário de acesso é: ' + usuario + '\n' +
          'Guarde esse usuário — você vai usá-lo para entrar no app junto com a senha que cadastrou.\n\n' +
          'O coordenador de cada pastoral vai aprovar a participação. Você acompanha pelo app.\n\n' +
          'Acesse pelo link: ' + urlAcesso_() + '\n\n' +
          PARÓQUIA.nome + '\n' + PARÓQUIA.endereco + '\n' + PARÓQUIA.telefone
      });
    } catch (err) {
      // não bloqueia o cadastro se o envio de e-mail falhar
    }
    avisarCoordenadoresDePedidos_(pedidos);

    const resposta = montarRespostaLogin_({ id: respId, nome: nome, administrador: false },
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

  const link = linkRedefinicao_(token);
  MailApp.sendEmail({
    to: encontrado.email,
    subject: 'Redefinição de senha — Escala Litúrgica',
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
/* Modelo multi-pastoral: leitura das abas                                */
/* ---------------------------------------------------------------------- */

function valoresAba_(nome) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  return sheet ? sheet.getDataRange().getValues() : [];
}

function partirIds_(valor) {
  return valor ? String(valor).split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
}

function formatarData_(data) {
  return Utilities.formatDate(data, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function lerPastorais_() {
  const dados = valoresAba_(ABA_PASTORAIS);
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    const id = dados[i][0];
    if (!id) continue;
    const ativa = dados[i][3];
    lista.push({
      id: String(id),
      nome: String(dados[i][1] || ''),
      coordenadorId: String(dados[i][2] || ''),
      ativa: ativa === '' || ativa === undefined || ativa === null ? true : ehVerdadeiro_(ativa),
      exigeResponsavel: ehVerdadeiro_(dados[i][4]),
      linha: i + 1
    });
  }
  return lista;
}

function lerFuncoes_() {
  const dados = valoresAba_(ABA_FUNCOES);
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    const id = dados[i][0];
    if (!id) continue;
    lista.push({
      id: String(id),
      pastoralId: String(dados[i][1] || ''),
      nome: String(dados[i][2] || ''),
      minimo: Number(dados[i][3]) || 0,
      maximo: Number(dados[i][4]) || 0,
      linha: i + 1
    });
  }
  return lista;
}

function lerMembros_() {
  const dados = valoresAba_(ABA_MEMBROS);
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    if (!dados[i][0]) continue;
    lista.push({
      pessoaId: String(dados[i][0]),
      pastoralId: String(dados[i][1] || ''),
      funcaoId: String(dados[i][2] || ''),
      situacao: String(dados[i][3] || '').toLowerCase() === 'pendente' ? 'pendente' : 'ativo',
      linha: i + 1
    });
  }
  return lista;
}

function lerPessoas_() {
  const dados = valoresAba_(ABA_CRIANCAS);
  const mapa = {};
  for (let i = 1; i < dados.length; i++) {
    const id = dados[i][0];
    if (!id) continue;
    mapa[String(id)] = {
      id: String(id),
      nome: String(dados[i][1] || ''),
      tipo: String(dados[i][3] || '').toLowerCase() === 'adulto' ? 'adulto' : 'crianca',
      nascimento: nascimentoDaCelula_(dados[i][4])
    };
  }
  return mapa;
}

function lerVinculos_() {
  const dados = valoresAba_(ABA_VINCULOS);
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] && dados[i][1]) lista.push({ responsavelId: String(dados[i][0]), pessoaId: String(dados[i][1]) });
  }
  return lista;
}

function lerResponsaveis_() {
  const dados = valoresAba_(ABA_RESPONSAVEIS);
  const mapa = {};
  for (let i = 1; i < dados.length; i++) {
    const id = dados[i][0];
    if (!id) continue;
    mapa[String(id)] = {
      id: String(id), nome: String(dados[i][1] || ''), usuario: String(dados[i][2] || ''),
      email: String(dados[i][4] || ''), celular: dados[i][5], administrador: ehVerdadeiro_(dados[i][7])
    };
  }
  return mapa;
}

/** Funções de pastorais ativas, já com o nome da pastoral. */
function funcoesAtivas_(pastorais, funcoes) {
  const porId = {};
  pastorais.forEach(function (p) { if (p.ativa) porId[p.id] = p; });
  return funcoes
    .filter(function (f) { return porId[f.pastoralId]; })
    .map(function (f) { return Object.assign({}, f, { pastoral: porId[f.pastoralId].nome }); });
}

/** Lê o horário de uma célula (Date ou texto) e devolve { horas, minutos, texto }. */
function lerHorario_(horario) {
  let horas = 0, minutos = 0, texto = '';
  if (Object.prototype.toString.call(horario) === '[object Date]' && !isNaN(horario)) {
    horas = horario.getHours();
    minutos = horario.getMinutes();
    texto = Utilities.formatDate(horario, Session.getScriptTimeZone(), 'HH:mm');
  } else if (horario) {
    const partes = String(horario).split(':');
    horas = Number(partes[0]) || 0;
    minutos = Number(partes[1]) || 0;
    texto = String(horario);
  }
  return { horas: horas, minutos: minutos, texto: texto };
}

/** Eventos da aba Eventos. Por padrão só os que ainda não aconteceram, em ordem de data. */
function lerEventos_(incluirPassados) {
  const dados = valoresAba_(ABA_EVENTOS);
  const agora = new Date();
  const eventos = [];
  for (let i = 1; i < dados.length; i++) {
    const id = dados[i][0];
    if (!id || !dados[i][1]) continue;
    const dataObj = new Date(dados[i][1]);
    if (isNaN(dataObj)) continue;
    const h = lerHorario_(dados[i][2]);
    const dataHora = new Date(dataObj.getFullYear(), dataObj.getMonth(), dataObj.getDate(), h.horas, h.minutos);
    if (!incluirPassados && dataHora < agora) continue;
    eventos.push({
      id: String(id),
      linha: i + 1,
      data: formatarData_(dataObj),
      diaSemana: nomeDiaSemana_(dataObj),
      dataOrdenacao: dataHora.getTime(),
      horario: h.texto,
      descricao: dados[i][3] === null || dados[i][3] === undefined ? '' : String(dados[i][3])
    });
  }
  eventos.sort(function (a, b) { return a.dataOrdenacao - b.dataOrdenacao; });
  return eventos;
}

function lerVagasMapa_() {
  const dados = valoresAba_(ABA_VAGAS);
  const mapa = {};
  for (let i = 1; i < dados.length; i++) {
    if (!dados[i][0] || !dados[i][1]) continue;
    mapa[String(dados[i][0]) + '|' + String(dados[i][1])] = {
      linha: i + 1,
      minimo: Number(dados[i][2]) || 0,
      maximo: Number(dados[i][3]) || 0,
      escalados: partirIds_(dados[i][4])
    };
  }
  return mapa;
}

/** Vaga de uma função em um evento: a linha da aba Vagas, ou o padrão da função quando não existe. */
function vagaDe_(mapa, eventoId, funcao) {
  const linha = mapa[eventoId + '|' + funcao.id];
  return {
    funcaoId: funcao.id,
    funcao: funcao.nome,
    pastoralId: funcao.pastoralId,
    pastoral: funcao.pastoral,
    minimo: linha ? linha.minimo : funcao.minimo,
    maximo: linha ? linha.maximo : funcao.maximo,
    escalados: linha ? linha.escalados.slice() : []
  };
}

/**
 * Eventos futuros com as vagas das funções informadas.
 * `filtroPastoralIds`: se informado, só as vagas dessas pastorais.
 */
function eventosComVagas_(filtroPastoralIds, incluirPassados) {
  const funcoes = funcoesAtivas_(lerPastorais_(), lerFuncoes_()).filter(function (f) {
    return !filtroPastoralIds || filtroPastoralIds.indexOf(f.pastoralId) !== -1;
  });
  const mapa = lerVagasMapa_();
  return lerEventos_(incluirPassados).map(function (e) {
    return {
      id: e.id,
      data: e.data,
      diaSemana: e.diaSemana,
      dataOrdenacao: e.dataOrdenacao,
      horario: e.horario,
      descricao: e.descricao,
      vagas: funcoes.map(function (f) { return vagaDe_(mapa, e.id, f); })
    };
  });
}

function nomesPorId_(ids, pessoas) {
  return ids.map(function (id) { return pessoas[id] ? pessoas[id].nome : '(?)'; });
}

/** Grava (ou cria) a linha de vaga. Chamar dentro do lock. */
function gravarVaga_(eventoId, funcaoId, minimo, maximo, escalados) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_VAGAS);
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === eventoId && String(dados[i][1]) === funcaoId) {
      sheet.getRange(i + 1, 3).setValue(minimo);
      sheet.getRange(i + 1, 4).setValue(maximo);
      sheet.getRange(i + 1, 5).setValue(escalados.join(', '));
      return;
    }
  }
  sheet.appendRow([eventoId, funcaoId, minimo, maximo, escalados.join(', ')]);
}

/* ---------------------------------------------------------------------- */
/* Permissões                                                             */
/* ---------------------------------------------------------------------- */

function exigirAdministrador_(sessao) {
  const u = autenticar_(sessao);
  if (!u.administrador) throw new Error('SEM_PERMISSAO');
  return u;
}

/** Coordenador **desta** pastoral (não basta ser coordenador de outra). */
function exigirCoordenadorDe_(sessao, pastoralId) {
  const u = autenticar_(sessao);
  const id = String(pastoralId === null || pastoralId === undefined ? '' : pastoralId);
  const pastoral = lerPastorais_().filter(function (p) { return p.id === id; })[0];
  if (!pastoral || !pastoral.ativa || pastoral.coordenadorId !== String(u.id)) throw new Error('SEM_PERMISSAO');
  return { u: u, pastoral: pastoral };
}

function responsavelTemPessoa_(responsavelId, pessoaId) {
  return lerVinculos_().some(function (v) { return v.responsavelId === String(responsavelId) && v.pessoaId === pessoaId; });
}

/* ---------------------------------------------------------------------- */
/* Pastorais abertas ao cadastro                                          */
/* ---------------------------------------------------------------------- */

/** Pastorais ativas e suas funções. Sem sessão: é o que a tela de cadastro precisa. */
function listarPastoraisPublico() {
  const pastorais = lerPastorais_().filter(function (p) { return p.ativa; });
  const funcoes = lerFuncoes_();
  return pastorais.map(function (p) {
    return {
      id: p.id,
      nome: p.nome,
      exigeResponsavel: p.exigeResponsavel,
      funcoes: funcoes
        .filter(function (f) { return f.pastoralId === p.id; })
        .map(function (f) { return { id: f.id, nome: f.nome }; })
    };
  });
}

/* ---------------------------------------------------------------------- */
/* Missas: visão dos responsáveis                                         */
/* ---------------------------------------------------------------------- */

/** Pastorais em que alguma pessoa do responsável participa (participação aprovada). */
function pastoraisDoResponsavel_(responsavelId) {
  const pessoasDele = {};
  lerVinculos_().forEach(function (v) { if (v.responsavelId === String(responsavelId)) pessoasDele[v.pessoaId] = true; });
  const ids = {};
  lerMembros_().forEach(function (m) {
    if (pessoasDele[m.pessoaId] && m.situacao === 'ativo') ids[m.pastoralId] = true;
  });
  return Object.keys(ids);
}

/**
 * Missas futuras com as vagas das pastorais em que a família participa.
 * Só ids de pessoas: nomes de outras famílias não saem daqui.
 */
function listarMissas(sessao) {
  const u = autenticar_(sessao);
  const pastoralIds = pastoraisDoResponsavel_(u.id);
  if (pastoralIds.length === 0) {
    return eventosComVagas_([], false).map(function (e) { return Object.assign({}, e, { vagas: [] }); });
  }
  return eventosComVagas_(pastoralIds, false);
}

/** Confere permissão e participação ativa. Devolve { erro } ou { funcao }. */
function validarAlvoEscala_(u, pessoaId, funcaoId) {
  pessoaId = String(pessoaId === null || pessoaId === undefined ? '' : pessoaId);
  funcaoId = String(funcaoId === null || funcaoId === undefined ? '' : funcaoId);

  const funcoes = funcoesAtivas_(lerPastorais_(), lerFuncoes_());
  const funcao = funcoes.filter(function (f) { return f.id === funcaoId; })[0];
  if (!funcao) return { erro: { sucesso: false, mensagem: 'Função inválida.' } };

  const dono = responsavelTemPessoa_(u.id, pessoaId);
  const pastoral = lerPastorais_().filter(function (p) { return p.id === funcao.pastoralId; })[0];
  const coordena = !!pastoral && pastoral.coordenadorId === String(u.id);
  if (!dono && !coordena) throw new Error('SEM_PERMISSAO');

  const membro = lerMembros_().filter(function (m) {
    return m.pessoaId === pessoaId && m.funcaoId === funcaoId && m.situacao === 'ativo';
  })[0];
  if (!membro) return { erro: { sucesso: false, mensagem: 'Essa pessoa ainda não faz parte dessa função.' } };
  return { funcao: funcao };
}

function inscrever(sessao, eventoId, pessoaId, funcaoId) {
  const u = autenticar_(sessao);
  eventoId = String(eventoId === null || eventoId === undefined ? '' : eventoId);
  const alvo = validarAlvoEscala_(u, pessoaId, funcaoId);
  if (alvo.erro) return alvo.erro;
  pessoaId = String(pessoaId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const evento = lerEventos_(true).filter(function (e) { return e.id === eventoId; })[0];
    if (!evento) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    const vaga = vagaDe_(lerVagasMapa_(), eventoId, alvo.funcao);
    if (vaga.escalados.indexOf(pessoaId) !== -1) {
      return { sucesso: false, mensagem: 'Essa pessoa já está escalada nessa missa.' };
    }
    if (vaga.escalados.length >= vaga.maximo) {
      return { sucesso: false, mensagem: 'Não há mais vagas para essa função nessa missa.' };
    }
    vaga.escalados.push(pessoaId);
    gravarVaga_(eventoId, alvo.funcao.id, vaga.minimo, vaga.maximo, vaga.escalados);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

function cancelar(sessao, eventoId, pessoaId, funcaoId) {
  const u = autenticar_(sessao);
  eventoId = String(eventoId === null || eventoId === undefined ? '' : eventoId);
  const alvo = validarAlvoEscala_(u, pessoaId, funcaoId);
  if (alvo.erro) return alvo.erro;
  pessoaId = String(pessoaId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const evento = lerEventos_(true).filter(function (e) { return e.id === eventoId; })[0];
    if (!evento) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    const vaga = vagaDe_(lerVagasMapa_(), eventoId, alvo.funcao);
    const restantes = vaga.escalados.filter(function (id) { return id !== pessoaId; });
    if (restantes.length !== vaga.escalados.length) {
      gravarVaga_(eventoId, alvo.funcao.id, vaga.minimo, vaga.maximo, restantes);
    }
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Entrada em pastoral                                                    */
/* ---------------------------------------------------------------------- */

function avisarCoordenadoresDePedidos_(pedidos) {
  // pedidos: [{ pastoralId, pessoaNome, funcaoNome }]
  try {
    const pastorais = lerPastorais_();
    const responsaveis = lerResponsaveis_();
    const porCoordenador = {};
    pedidos.forEach(function (p) {
      const pastoral = pastorais.filter(function (x) { return x.id === p.pastoralId; })[0];
      if (!pastoral || !pastoral.coordenadorId) return;
      const coord = responsaveis[pastoral.coordenadorId];
      if (!coord || !REGEX_EMAIL.test(coord.email)) return;
      const chave = coord.id;
      porCoordenador[chave] = porCoordenador[chave] || { coord: coord, linhas: [] };
      porCoordenador[chave].linhas.push('- ' + p.pessoaNome + ' quer servir como ' + p.funcaoNome + ' (' + pastoral.nome + ')');
    });
    Object.keys(porCoordenador).forEach(function (k) {
      const item = porCoordenador[k];
      MailApp.sendEmail({
        to: item.coord.email,
        subject: 'Novo pedido de entrada na sua pastoral — ' + PARÓQUIA.nome,
        body: 'Olá, ' + item.coord.nome + '!\n\n' + item.linhas.join('\n') +
          '\n\nEntre no app, abra o Painel e aprove ou recuse em "Membros".\n\n' + PARÓQUIA.nome
      });
    });
  } catch (err) {
    // aviso é cortesia: não bloqueia o cadastro nem o pedido
  }
}

/** Uma pessoa do responsável pede para fazer parte de uma função. Fica pendente. */
function solicitarEntrada(sessao, pessoaId, funcaoId) {
  const u = autenticar_(sessao);
  pessoaId = String(pessoaId === null || pessoaId === undefined ? '' : pessoaId);
  funcaoId = String(funcaoId === null || funcaoId === undefined ? '' : funcaoId);
  if (!responsavelTemPessoa_(u.id, pessoaId)) throw new Error('SEM_PERMISSAO');

  const funcao = funcoesAtivas_(lerPastorais_(), lerFuncoes_()).filter(function (f) { return f.id === funcaoId; })[0];
  if (!funcao) return { sucesso: false, mensagem: 'Função inválida.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ja = lerMembros_().some(function (m) { return m.pessoaId === pessoaId && m.funcaoId === funcaoId; });
    if (ja) return { sucesso: false, mensagem: 'Essa pessoa já participa, ou já pediu para participar, dessa função.' };

    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MEMBROS)
      .appendRow([pessoaId, funcao.pastoralId, funcao.id, 'pendente']);
    const pessoa = lerPessoas_()[pessoaId];
    avisarCoordenadoresDePedidos_([{ pastoralId: funcao.pastoralId, pessoaNome: pessoa ? pessoa.nome : '', funcaoNome: funcao.nome }]);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Coordenação (cada ação exige ser coordenador da pastoral informada)    */
/* ---------------------------------------------------------------------- */

/** Membros e pedidos pendentes da pastoral. Pendentes primeiro. */
function listarMembros(sessao, pastoralId) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  const pessoas = lerPessoas_();
  const funcoes = lerFuncoes_();
  const responsaveis = lerResponsaveis_();
  const vinculos = lerVinculos_();

  const lista = lerMembros_()
    .filter(function (m) { return m.pastoralId === ctx.pastoral.id && pessoas[m.pessoaId]; })
    .map(function (m) {
      const f = funcoes.filter(function (x) { return x.id === m.funcaoId; })[0];
      const donos = vinculos
        .filter(function (v) { return v.pessoaId === m.pessoaId; })
        .map(function (v) { return responsaveis[v.responsavelId] ? responsaveis[v.responsavelId].nome : ''; })
        .filter(Boolean);
      return {
        pessoaId: m.pessoaId,
        nome: pessoas[m.pessoaId].nome,
        tipo: pessoas[m.pessoaId].tipo,
        // só a idade: a coordenação não precisa da data de nascimento
        idade: idadeDeNascimento_(pessoas[m.pessoaId].nascimento),
        funcaoId: m.funcaoId,
        funcao: f ? f.nome : '',
        situacao: m.situacao,
        responsavel: donos.join(', ')
      };
    });
  lista.sort(function (a, b) {
    if (a.situacao !== b.situacao) return a.situacao === 'pendente' ? -1 : 1;
    return String(a.nome).localeCompare(String(b.nome));
  });
  return lista;
}

/** dados: { pessoaId, funcaoId, aprovar: true|false }. Recusar apaga o pedido. */
function decidirEntrada(sessao, pastoralId, dados) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  dados = dados || {};
  const pessoaId = String(dados.pessoaId === null || dados.pessoaId === undefined ? '' : dados.pessoaId);
  const funcaoId = String(dados.funcaoId === null || dados.funcaoId === undefined ? '' : dados.funcaoId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const m = lerMembros_().filter(function (x) {
      return x.pessoaId === pessoaId && x.funcaoId === funcaoId && x.pastoralId === ctx.pastoral.id && x.situacao === 'pendente';
    })[0];
    if (!m) return { sucesso: false, mensagem: 'Pedido não encontrado. Atualize a lista.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MEMBROS);
    if (dados.aprovar === true) sheet.getRange(m.linha, 4).setValue('ativo');
    else sheet.deleteRow(m.linha);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/** dados: { pessoaId, funcaoId }. Tira a pessoa da função e das escalas futuras dela. */
function removerMembro(sessao, pastoralId, dados) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  dados = dados || {};
  const pessoaId = String(dados.pessoaId === null || dados.pessoaId === undefined ? '' : dados.pessoaId);
  const funcaoId = String(dados.funcaoId === null || dados.funcaoId === undefined ? '' : dados.funcaoId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const m = lerMembros_().filter(function (x) {
      return x.pessoaId === pessoaId && x.funcaoId === funcaoId && x.pastoralId === ctx.pastoral.id;
    })[0];
    if (!m) return { sucesso: false, mensagem: 'Membro não encontrado. Atualize a lista.' };

    const mapa = lerVagasMapa_();
    Object.keys(mapa).forEach(function (chave) {
      if (chave.split('|')[1] !== funcaoId) return;
      const v = mapa[chave];
      if (v.escalados.indexOf(pessoaId) === -1) return;
      gravarVaga_(chave.split('|')[0], funcaoId, v.minimo, v.maximo,
        v.escalados.filter(function (id) { return id !== pessoaId; }));
    });
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MEMBROS).deleteRow(m.linha);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/** Missas futuras com as vagas da pastoral e os nomes de quem está escalado. */
function listarMissasParaCoordenador(sessao, pastoralId) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  const pessoas = lerPessoas_();
  return eventosComVagas_([ctx.pastoral.id], false).map(function (e) {
    return Object.assign({}, e, {
      vagas: e.vagas.map(function (v) {
        return Object.assign({}, v, { nomes: nomesPorId_(v.escalados, pessoas) });
      })
    });
  });
}

/** limites: [{ funcaoId, minimo, maximo }]. Ajusta as vagas da pastoral nesta missa. */
function ajustarVagas(sessao, pastoralId, eventoId, limites) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  eventoId = String(eventoId === null || eventoId === undefined ? '' : eventoId);
  if (!Array.isArray(limites) || limites.length === 0 || limites.length > 20) {
    return { sucesso: false, mensagem: 'Informe os limites das vagas.' };
  }

  const funcoes = lerFuncoes_().filter(function (f) { return f.pastoralId === ctx.pastoral.id; });
  const novos = [];
  for (let i = 0; i < limites.length; i++) {
    const l = limites[i] || {};
    const f = funcoes.filter(function (x) { return x.id === String(l.funcaoId); })[0];
    if (!f) return { sucesso: false, mensagem: 'Função inválida.' };
    const minimo = numeroLimitado_(l.minimo, 50);
    const maximo = numeroLimitado_(l.maximo, 50);
    if (minimo > maximo) {
      return { sucesso: false, mensagem: 'Em ' + f.nome + ', o mínimo não pode ser maior que o máximo.' };
    }
    novos.push({ funcao: f, minimo: minimo, maximo: maximo });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!lerEventos_(true).some(function (e) { return e.id === eventoId; })) {
      return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };
    }
    const mapa = lerVagasMapa_();
    novos.forEach(function (n) {
      const atual = mapa[eventoId + '|' + n.funcao.id];
      gravarVaga_(eventoId, n.funcao.id, n.minimo, n.maximo, atual ? atual.escalados : []);
    });
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

function obterResumoCoordenador(sessao, pastoralId) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  const missas = eventosComVagas_([ctx.pastoral.id], false);
  const membros = lerMembros_().filter(function (m) { return m.pastoralId === ctx.pastoral.id; });
  const ativos = {};
  let pendentes = 0;
  membros.forEach(function (m) {
    if (m.situacao === 'pendente') pendentes++;
    else ativos[m.pessoaId] = true;
  });

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const em7dias = new Date(hoje); em7dias.setDate(em7dias.getDate() + 7); em7dias.setHours(23, 59, 59, 999);
  const em3dias = new Date(hoje); em3dias.setDate(em3dias.getDate() + 3); em3dias.setHours(23, 59, 59, 999);

  let abaixoDoMinimo = 0, abertas7dias = 0, somaEscalados = 0, somaMaximo = 0;
  let proximo = null;
  const alertas = [];

  missas.forEach(function (m) {
    const quando = new Date(m.dataOrdenacao);
    if (m.vagas.some(function (v) { return v.escalados.length < v.minimo; })) abaixoDoMinimo++;

    let escalados = 0, maximo = 0;
    m.vagas.forEach(function (v) {
      escalados += v.escalados.length;
      maximo += v.maximo;
      if (quando <= em7dias) abertas7dias += Math.max(0, v.maximo - v.escalados.length);
    });
    somaEscalados += escalados;
    somaMaximo += maximo;

    if (!proximo) {
      proximo = {
        data: m.data, horario: m.horario, diaSemana: m.diaSemana, descricao: m.descricao,
        vagas: m.vagas.map(function (v) {
          return { funcaoId: v.funcaoId, funcao: v.funcao, ocupadas: v.escalados.length, minimo: v.minimo, maximo: v.maximo };
        })
      };
    }

    if (quando <= em3dias) {
      const ocupacao = maximo > 0 ? escalados / maximo : 1;
      if (ocupacao < 0.5) {
        alertas.push({
          eventoId: m.id, data: m.data, horario: m.horario, diaSemana: m.diaSemana,
          ocupacaoPct: Math.round(ocupacao * 100),
          vagas: m.vagas.map(function (v) {
            return { funcaoId: v.funcaoId, funcao: v.funcao, ocupadas: v.escalados.length, maximo: v.maximo };
          })
        });
      }
    }
  });

  return {
    pastoral: { id: ctx.pastoral.id, nome: ctx.pastoral.nome },
    missasAbaixoDoMinimo: abaixoDoMinimo,
    vagasAbertas7dias: abertas7dias,
    taxaOcupacao: somaMaximo > 0 ? Math.round((somaEscalados / somaMaximo) * 100) : 0,
    totalMembros: Object.keys(ativos).length,
    pendentes: pendentes,
    proximo: proximo,
    alertas: alertas
  };
}

function montarMensagemChamada_(dados) {
  const descricaoTexto = dados.descricao ? (' (' + dados.descricao + ')') : '';
  return TEMPLATE_MENSAGEM_CHAMADA
    .replace('{responsavel}', function () { return dados.responsavel; })
    .replace('{funcao}', function () { return dados.funcao; })
    .replace('{pastoral}', function () { return dados.pastoral; })
    .replace('{diaSemana}', function () { return dados.diaSemana; })
    .replace('{data}', function () { return dados.data; })
    .replace('{horario}', function () { return dados.horario; })
    .replace('{descricaoTexto}', function () { return descricaoTexto; })
    .replace('{pessoa}', function () { return dados.pessoa; })
    .replace('{paroquia}', function () { return PARÓQUIA.nome; });
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

/**
 * Membros ativos da função que estão livres (sem nenhuma missa futura), com o link do WhatsApp
 * do responsável já pronto. Só o coordenador da pastoral da função enxerga isto.
 */
function obterResponsaveisParaChamar(sessao, pastoralId, eventoId, funcaoId) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  eventoId = String(eventoId === null || eventoId === undefined ? '' : eventoId);
  funcaoId = String(funcaoId === null || funcaoId === undefined ? '' : funcaoId);

  const funcao = lerFuncoes_().filter(function (f) { return f.id === funcaoId && f.pastoralId === ctx.pastoral.id; })[0];
  if (!funcao) return [];
  const missas = eventosComVagas_(null, false);
  const missa = missas.filter(function (m) { return m.id === eventoId; })[0];
  if (!missa) return [];

  const ocupados = {};
  missas.forEach(function (m) {
    m.vagas.forEach(function (v) { v.escalados.forEach(function (id) { ocupados[id] = true; }); });
  });

  const pessoas = lerPessoas_();
  const responsaveis = lerResponsaveis_();
  const vinculos = lerVinculos_();

  const livres = lerMembros_().filter(function (m) {
    return m.funcaoId === funcaoId && m.situacao === 'ativo' && !ocupados[m.pessoaId] && pessoas[m.pessoaId];
  });

  const resultado = [];
  livres.forEach(function (m) {
    const pessoa = pessoas[m.pessoaId];
    vinculos.filter(function (v) { return v.pessoaId === m.pessoaId; }).forEach(function (v) {
      const resp = responsaveis[v.responsavelId];
      if (!resp) return;
      const telefone = formatarTelefoneWhatsApp_(resp.celular);
      const item = { pessoaNome: pessoa.nome, responsavelNome: resp.nome, semCelular: !telefone };
      if (telefone) {
        const mensagem = montarMensagemChamada_({
          responsavel: resp.nome, funcao: funcao.nome, pastoral: ctx.pastoral.nome,
          diaSemana: missa.diaSemana, data: missa.data, horario: missa.horario, descricao: missa.descricao,
          pessoa: pessoa.tipo === 'adulto' && pessoa.nome === resp.nome ? 'Você' : pessoa.nome
        });
        item.link = 'https://api.whatsapp.com/send/?phone=' + telefone +
          '&text=' + encodeURIComponent(mensagem) + '&type=phone_number&app_absent=0';
      }
      resultado.push(item);
    });
  });
  return resultado;
}

/* ---------------------------------------------------------------------- */
/* Administração: missas e pastorais (perfil administrador)               */
/* ---------------------------------------------------------------------- */

/** Pastorais, funções e coordenadores, as missas futuras e as pessoas que podem coordenar. Sem dados de crianças. */
function obterAdministracao(sessao) {
  exigirAdministrador_(sessao);
  const pastorais = lerPastorais_();
  const funcoes = lerFuncoes_();
  const responsaveis = lerResponsaveis_();

  const mapa = lerVagasMapa_();
  const funcoesAtivasLista = funcoesAtivas_(pastorais, funcoes);

  return {
    pastorais: pastorais.map(function (p) {
      const coord = responsaveis[p.coordenadorId];
      return {
        id: p.id,
        nome: p.nome,
        ativa: p.ativa,
        exigeResponsavel: p.exigeResponsavel,
        coordenadorId: p.coordenadorId,
        coordenador: coord ? coord.nome : '',
        funcoes: funcoes
          .filter(function (f) { return f.pastoralId === p.id; })
          .map(function (f) { return { id: f.id, nome: f.nome, minimo: f.minimo, maximo: f.maximo }; })
      };
    }),
    usuarios: Object.keys(responsaveis)
      .map(function (id) { return { id: id, nome: responsaveis[id].nome }; })
      .sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome)); }),
    missas: lerEventos_(false).map(function (e) {
      const vagas = funcoesAtivasLista.map(function (f) { return vagaDe_(mapa, e.id, f); });
      return {
        id: e.id, data: e.data, diaSemana: e.diaSemana, horario: e.horario, descricao: e.descricao,
        // só contagens: o administrador não vê nomes
        pastorais: pastorais.filter(function (p) { return p.ativa; }).map(function (p) {
          const doP = vagas.filter(function (v) { return v.pastoralId === p.id; });
          return {
            pastoralId: p.id, pastoral: p.nome,
            escalados: doP.reduce(function (s, v) { return s + v.escalados.length; }, 0),
            maximo: doP.reduce(function (s, v) { return s + v.maximo; }, 0)
          };
        })
      };
    })
  };
}

function limparFuncoesEntrada_(funcoesEntrada) {
  const lista = Array.isArray(funcoesEntrada) ? funcoesEntrada.slice(0, 12) : [];
  const saida = [];
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i] || {};
    const nome = limparTexto_(f.nome, 60);
    if (!nome) continue;
    const minimo = numeroLimitado_(f.minimo, 50);
    const maximo = numeroLimitado_(f.maximo, 50);
    if (minimo > maximo) return { erro: 'Em ' + nome + ', o mínimo não pode ser maior que o máximo.' };
    saida.push({ id: f.id ? String(f.id) : '', nome: nome, minimo: minimo, maximo: maximo });
  }
  return { funcoes: saida };
}

/** dados: { nome, coordenadorId, exigeResponsavel?, funcoes: [{ nome, minimo, maximo }] } */
function criarPastoral(sessao, dados) {
  exigirAdministrador_(sessao);
  dados = dados || {};
  const nome = limparTexto_(dados.nome, 60);
  if (!nome) return { sucesso: false, mensagem: 'Informe o nome da pastoral.' };
  const coordenadorId = String(dados.coordenadorId === null || dados.coordenadorId === undefined ? '' : dados.coordenadorId);
  if (!lerResponsaveis_()[coordenadorId]) return { sucesso: false, mensagem: 'Escolha o coordenador da pastoral.' };
  const f = limparFuncoesEntrada_(dados.funcoes);
  if (f.erro) return { sucesso: false, mensagem: f.erro };
  if (f.funcoes.length === 0) return { sucesso: false, mensagem: 'Informe ao menos uma função (ex.: Leitor).' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existe = lerPastorais_().some(function (p) { return removerAcentos_(p.nome).toLowerCase() === removerAcentos_(nome).toLowerCase(); });
    if (existe) return { sucesso: false, mensagem: 'Já existe uma pastoral com esse nome.' };

    const pastoraisSheet = ss.getSheetByName(ABA_PASTORAIS);
    const funcoesSheet = ss.getSheetByName(ABA_FUNCOES);
    const id = proximoId_(pastoraisSheet, 'P');
    pastoraisSheet.appendRow([id, nome, coordenadorId, true, dados.exigeResponsavel === true]);
    f.funcoes.forEach(function (fn) {
      funcoesSheet.appendRow([proximoId_(funcoesSheet, 'F'), id, fn.nome, fn.minimo, fn.maximo]);
    });
    return { sucesso: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

/**
 * dados: { nome?, coordenadorId?, ativa?, exigeResponsavel?, funcoes?: [{ id?, nome, minimo, maximo }] }
 * Função com `id` é atualizada; sem `id` é criada. Funções não são apagadas (as escalas dependem delas).
 */
function editarPastoral(sessao, pastoralId, dados) {
  exigirAdministrador_(sessao);
  dados = dados || {};
  pastoralId = String(pastoralId === null || pastoralId === undefined ? '' : pastoralId);

  let nome = null;
  if (dados.nome !== undefined) {
    nome = limparTexto_(dados.nome, 60);
    if (!nome) return { sucesso: false, mensagem: 'Informe o nome da pastoral.' };
  }
  let coordenadorId = null;
  if (dados.coordenadorId !== undefined) {
    coordenadorId = String(dados.coordenadorId);
    if (!lerResponsaveis_()[coordenadorId]) return { sucesso: false, mensagem: 'Escolha o coordenador da pastoral.' };
  }
  let f = null;
  if (dados.funcoes !== undefined) {
    f = limparFuncoesEntrada_(dados.funcoes);
    if (f.erro) return { sucesso: false, mensagem: f.erro };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pastoral = lerPastorais_().filter(function (p) { return p.id === pastoralId; })[0];
    if (!pastoral) return { sucesso: false, mensagem: 'Pastoral não encontrada. Atualize a lista.' };

    const sheet = ss.getSheetByName(ABA_PASTORAIS);
    if (nome !== null) {
      const duplicado = lerPastorais_().some(function (p) {
        return p.id !== pastoralId && removerAcentos_(p.nome).toLowerCase() === removerAcentos_(nome).toLowerCase();
      });
      if (duplicado) return { sucesso: false, mensagem: 'Já existe uma pastoral com esse nome.' };
      sheet.getRange(pastoral.linha, 2).setValue(nome);
    }
    if (coordenadorId !== null) sheet.getRange(pastoral.linha, 3).setValue(coordenadorId);
    if (dados.ativa !== undefined) sheet.getRange(pastoral.linha, 4).setValue(dados.ativa === true);
    if (dados.exigeResponsavel !== undefined) sheet.getRange(pastoral.linha, 5).setValue(dados.exigeResponsavel === true);

    if (f) {
      const funcoesSheet = ss.getSheetByName(ABA_FUNCOES);
      const existentes = lerFuncoes_().filter(function (x) { return x.pastoralId === pastoralId; });
      f.funcoes.forEach(function (fn) {
        const atual = fn.id ? existentes.filter(function (x) { return x.id === fn.id; })[0] : null;
        if (atual) {
          funcoesSheet.getRange(atual.linha, 3).setValue(fn.nome);
          funcoesSheet.getRange(atual.linha, 4).setValue(fn.minimo);
          funcoesSheet.getRange(atual.linha, 5).setValue(fn.maximo);
        } else if (!fn.id) {
          funcoesSheet.appendRow([proximoId_(funcoesSheet, 'F'), pastoralId, fn.nome, fn.minimo, fn.maximo]);
        }
      });
    }
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

function dataDeTexto_(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto === null || texto === undefined ? '' : texto));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d) || d.getMonth() !== Number(m[2]) - 1) return null;
  return d;
}

function existeEventoNoHorario_(data, horario) {
  const alvo = formatarData_(data);
  return lerEventos_(true).some(function (e) { return e.data === alvo && e.horario === horario; });
}

/** dados: { data: "yyyy-MM-dd", horario: "HH:mm", descricao } */
function criarMissa(sessao, dados) {
  exigirAdministrador_(sessao);
  dados = dados || {};
  const data = dataDeTexto_(dados.data);
  if (!data) return { sucesso: false, mensagem: 'Data inválida.' };
  const horario = String(dados.horario || '');
  if (!REGEX_HORARIO.test(horario)) return { sucesso: false, mensagem: 'Horário inválido.' };
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (data < hoje) return { sucesso: false, mensagem: 'Essa data já passou.' };
  const descricao = limparTexto_(dados.descricao, 100);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (existeEventoNoHorario_(data, horario)) {
      return { sucesso: false, mensagem: 'Já existe uma missa nessa data e horário.' };
    }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_EVENTOS);
    const id = proximoId_(sheet, 'E');
    sheet.appendRow([id, data, horario, descricao]);
    return { sucesso: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

/** Cria missas semanais a partir de hoje. As que já existem (mesma data e horário) são puladas. */
function gerarMissasRecorrentes(sessao, config) {
  exigirAdministrador_(sessao);
  config = config || {};

  const diaIndex = DIAS_SEMANA.indexOf(config.diaSemana);
  if (diaIndex === -1) return { sucesso: false, mensagem: 'Dia da semana inválido.' };
  const horario = String(config.horario || '');
  if (!REGEX_HORARIO.test(horario)) return { sucesso: false, mensagem: 'Horário inválido.' };
  const descricao = limparTexto_(config.descricao, 100);
  const semanas = Math.min(52, Math.max(1, Math.floor(Number(config.semanas)) || 1));

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_EVENTOS);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proxima = new Date(hoje);
    while (proxima.getDay() !== diaIndex) proxima.setDate(proxima.getDate() + 1);

    let criadas = 0, ignoradas = 0;
    for (let i = 0; i < semanas; i++) {
      const data = new Date(proxima);
      data.setDate(data.getDate() + i * 7);
      if (existeEventoNoHorario_(data, horario)) { ignoradas++; continue; }
      sheet.appendRow([proximoId_(sheet, 'E'), data, horario, descricao]);
      criadas++;
    }
    return { sucesso: true, criadas: criadas, ignoradas: ignoradas };
  } finally {
    lock.releaseLock();
  }
}

/** dados: { horario?, descricao? }. As vagas são ajustadas pelo coordenador de cada pastoral. */
function editarMissa(sessao, eventoId, dados) {
  exigirAdministrador_(sessao);
  dados = dados || {};
  eventoId = String(eventoId === null || eventoId === undefined ? '' : eventoId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const evento = lerEventos_(true).filter(function (e) { return e.id === eventoId; })[0];
    if (!evento) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_EVENTOS);
    if (dados.horario !== undefined) {
      if (!REGEX_HORARIO.test(String(dados.horario))) return { sucesso: false, mensagem: 'Horário inválido.' };
      sheet.getRange(evento.linha, 3).setValue(String(dados.horario));
    }
    if (dados.descricao !== undefined) sheet.getRange(evento.linha, 4).setValue(limparTexto_(dados.descricao, 100));
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

/** dataEsperada ("dd/MM/yyyy") garante que o id ainda é a missa que o administrador viu. */
function excluirMissa(sessao, eventoId, dataEsperada) {
  exigirAdministrador_(sessao);
  eventoId = String(eventoId === null || eventoId === undefined ? '' : eventoId);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const evento = lerEventos_(true).filter(function (e) { return e.id === eventoId; })[0];
    if (!evento) return { sucesso: false, mensagem: 'Missa não encontrada. Atualize a lista.' };
    if (dataEsperada && evento.data !== String(dataEsperada)) {
      return { sucesso: false, mensagem: 'A lista mudou desde que você abriu. Atualize e tente de novo.' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // apaga de baixo para cima para não deslocar as linhas ainda não visitadas
    const vagas = ss.getSheetByName(ABA_VAGAS);
    const dados = vagas.getDataRange().getValues();
    for (let i = dados.length - 1; i >= 1; i--) {
      if (String(dados[i][0]) === eventoId) vagas.deleteRow(i + 1);
    }
    ss.getSheetByName(ABA_EVENTOS).deleteRow(evento.linha);
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
  return enviarLembretes_(null);
}

/** Botão "Enviar lembretes agora" do painel: só as escalas da pastoral do coordenador. */
function enviarLembretesCoordenador(sessao, pastoralId) {
  const ctx = exigirCoordenadorDe_(sessao, pastoralId);
  return enviarLembretes_(ctx.pastoral.id);
}

/** Envia lembretes das missas de daqui a 3 dias. `pastoralId` null = todas as pastorais. */
function enviarLembretes_(pastoralId) {
  const pastorais = lerPastorais_().filter(function (p) { return p.ativa && (!pastoralId || p.id === pastoralId); });
  const idsPastorais = pastorais.map(function (p) { return p.id; });
  const pessoas = lerPessoas_();
  const responsaveis = lerResponsaveis_();
  const vinculos = lerVinculos_();

  const alvo = new Date();
  alvo.setDate(alvo.getDate() + 3);
  const alvoStr = Utilities.formatDate(alvo, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const eventos = eventosComVagas_(idsPastorais, true).filter(function (e) {
    return Utilities.formatDate(new Date(e.dataOrdenacao), Session.getScriptTimeZone(), 'yyyy-MM-dd') === alvoStr;
  });

  const porResponsavel = {};      // responsavelId -> linhas
  const escalaPorPastoral = {};   // pastoralId -> blocos de texto

  eventos.forEach(function (e) {
    const porPastoral = {};
    e.vagas.forEach(function (v) {
      if (v.escalados.length === 0) return;
      (porPastoral[v.pastoralId] = porPastoral[v.pastoralId] || []).push(
        '  ' + v.funcao + ': ' + nomesPorId_(v.escalados, pessoas).join(', '));
      v.escalados.forEach(function (pessoaId) {
        const nome = pessoas[pessoaId] ? pessoas[pessoaId].nome : '(?)';
        vinculos.filter(function (x) { return x.pessoaId === pessoaId; }).forEach(function (x) {
          (porResponsavel[x.responsavelId] = porResponsavel[x.responsavelId] || []).push(
            '- ' + nome + ' (' + v.funcao + ', ' + v.pastoral + '), ' + e.data + ' às ' + e.horario);
        });
      });
    });
    Object.keys(porPastoral).forEach(function (pid) {
      (escalaPorPastoral[pid] = escalaPorPastoral[pid] || []).push(
        e.data + ' às ' + e.horario + (e.descricao ? ' - ' + e.descricao : '') + '\n' + porPastoral[pid].join('\n'));
    });
  });

  let avisados = 0;
  Object.keys(porResponsavel).forEach(function (respId) {
    const resp = responsaveis[respId];
    if (!resp || !REGEX_EMAIL.test(resp.email)) return;
    MailApp.sendEmail({
      to: resp.email,
      subject: 'Lembrete: escala em 3 dias — ' + PARÓQUIA.nome,
      body: 'Olá, ' + resp.nome + '!\n\nLembrando que:\n\n' + porResponsavel[respId].join('\n') +
        '\n\n' + PARÓQUIA.nome + '\n' + PARÓQUIA.endereco + '\n' + PARÓQUIA.telefone
    });
    avisados++;
  });

  pastorais.forEach(function (p) {
    const blocos = escalaPorPastoral[p.id];
    const coord = responsaveis[p.coordenadorId];
    if (!blocos || !coord || !REGEX_EMAIL.test(coord.email)) return;
    MailApp.sendEmail({
      to: coord.email,
      subject: 'Escala completa de ' + p.nome + ', daqui a 3 dias — ' + PARÓQUIA.nome,
      body: 'Olá, ' + coord.nome + '!\n\nEscala de ' + p.nome + ' nas missas de daqui a 3 dias:\n\n' +
        blocos.join('\n\n') + '\n\n' + PARÓQUIA.nome
    });
  });

  return { sucesso: true, avisados: avisados };
}

/* ---------------------------------------------------------------------- */
/* Migração para o modelo multi-pastoral (só com PERMITIR_ADMIN = sim)     */
/* ---------------------------------------------------------------------- */

function abaOuNova_(ss, nome, cabecalho) {
  const sheet = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (sheet.getLastRow() === 0) sheet.appendRow(cabecalho);
  return sheet;
}

/**
 * Cria as abas do modelo multi-pastoral e copia o que existe hoje. Idempotente: pode rodar de novo.
 * As abas antigas (Missas e a coluna Funcao de Criancas) não são alteradas.
 */
function migrarParaMultiPastoral() {
  exigirAdmin_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const resp = abaOuNova_(ss, ABA_RESPONSAVEIS, ['ID', 'Nome', 'Usuario', 'Senha', 'Email', 'Celular', 'Coordenador', 'Administrador', 'Nascimento']);
    const respDados = resp.getDataRange().getValues();
    if (String(respDados[0][7] || '') === '') resp.getRange(1, 8).setValue('Administrador');
    if (String(respDados[0][8] || '') === '') resp.getRange(1, 9).setValue('Nascimento');
    const criancas = abaOuNova_(ss, ABA_CRIANCAS, ['ID', 'Nome', 'Funcao', 'Tipo', 'Nascimento']);
    if (String(criancas.getDataRange().getValues()[0][3] || '') === '') criancas.getRange(1, 4).setValue('Tipo');
    if (String(criancas.getDataRange().getValues()[0][4] || '') === '') criancas.getRange(1, 5).setValue('Nascimento');
    abaOuNova_(ss, ABA_VINCULOS, ['ResponsavelID', 'CriancaID']);
    abaOuNova_(ss, ABA_RESET, ['Token', 'ResponsavelID', 'ExpiraEm', 'Usado']);

    const pastoraisSheet = abaOuNova_(ss, ABA_PASTORAIS, ['ID', 'Nome', 'CoordenadorID', 'Ativa', 'ExigeResponsavel']);
    if (String(pastoraisSheet.getDataRange().getValues()[0][4] || '') === '') pastoraisSheet.getRange(1, 5).setValue('ExigeResponsavel');
    // pastoral de coroinhas já existente: a célula vazia passa a "sim" (uma vez; depois vale o que estiver na planilha)
    lerPastorais_().forEach(function (p) {
      const celula = pastoraisSheet.getRange(p.linha, 5).getValue();
      if (celula === '' && removerAcentos_(p.nome).toLowerCase().indexOf('coroinha') !== -1) {
        pastoraisSheet.getRange(p.linha, 5).setValue(true);
      }
    });
    const funcoesSheet = abaOuNova_(ss, ABA_FUNCOES, ['ID', 'PastoralID', 'Nome', 'MinPadrao', 'MaxPadrao']);
    const membrosSheet = abaOuNova_(ss, ABA_MEMBROS, ['PessoaID', 'PastoralID', 'FuncaoID', 'Situacao']);
    const eventosSheet = abaOuNova_(ss, ABA_EVENTOS, ['ID', 'Data', 'Horario', 'Descricao']);
    const vagasSheet = abaOuNova_(ss, ABA_VAGAS, ['EventoID', 'FuncaoID', 'Minimo', 'Maximo', 'Escalados']);

    // quem era coordenador vira administrador; o primeiro coordena a pastoral migrada
    const coordenadoresAntigos = [];
    for (let i = 1; i < respDados.length; i++) {
      if (!respDados[i][0]) continue;
      if (ehVerdadeiro_(respDados[i][6])) {
        coordenadoresAntigos.push(String(respDados[i][0]));
        if (!ehVerdadeiro_(respDados[i][7])) resp.getRange(i + 1, 8).setValue(true);
      }
    }

    if (lerPastorais_().length > 0) return { sucesso: true, jaMigrado: true };

    // pastoral e funções
    const missasAntigas = ss.getSheetByName(ABA_MISSAS) ? ss.getSheetByName(ABA_MISSAS).getDataRange().getValues() : [];
    const base = missasAntigas.length > 1 ? missasAntigas[1] : [];
    const minC = Number(base[3]) || 3, maxC = Number(base[4]) || 6;
    const minCe = Number(base[6]) || 2, maxCe = Number(base[7]) || 4;

    pastoraisSheet.appendRow(['P001', 'Coroinhas e Cerimoniários', coordenadoresAntigos[0] || '', true, true]);
    funcoesSheet.appendRow(['F001', 'P001', 'Coroinha', minC, maxC]);
    funcoesSheet.appendRow(['F002', 'P001', 'Cerimoniário', minCe, maxCe]);
    const funcaoPorNome = { 'coroinha': 'F001', 'cerimoniario': 'F002' };
    const norm = function (s) { return removerAcentos_(String(s || '')).trim().toLowerCase(); };

    // membros: a função que a criança tinha vira participação ativa
    const criancasDados = criancas.getDataRange().getValues();
    for (let i = 1; i < criancasDados.length; i++) {
      const id = criancasDados[i][0];
      const fid = funcaoPorNome[norm(criancasDados[i][2])];
      if (!id || !fid) continue;
      membrosSheet.appendRow([String(id), 'P001', fid, 'ativo']);
      if (String(criancasDados[i][3] || '') === '') criancas.getRange(i + 1, 4).setValue('crianca');
    }

    // eventos e escalas
    for (let i = 1; i < missasAntigas.length; i++) {
      const m = missasAntigas[i];
      if (!m[0]) continue;
      const eid = proximoId_(eventosSheet, 'E');
      eventosSheet.appendRow([eid, m[0], m[1], m[2]]);
      vagasSheet.appendRow([eid, 'F001', Number(m[3]) || 0, Number(m[4]) || 0, String(m[5] || '')]);
      vagasSheet.appendRow([eid, 'F002', Number(m[6]) || 0, Number(m[7]) || 0, String(m[8] || '')]);
    }

    return { sucesso: true, jaMigrado: false, coordenadores: coordenadoresAntigos.length };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */
/* Ferramentas de teste (bloqueadas em produção — ver exigirAdmin_)       */
/* ---------------------------------------------------------------------- */

function testeMissas() {
  exigirAdmin_();
  Logger.log('Pastorais: ' + JSON.stringify(lerPastorais_()));
  Logger.log('Funções: ' + JSON.stringify(lerFuncoes_()));
  Logger.log('Eventos futuros: ' + JSON.stringify(lerEventos_(false)));
}
