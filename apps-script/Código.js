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

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.tokenReset = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
  return template.evaluate()
    .setTitle('Escala de Coroinhas e Cerimoniários')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Rode uma vez pelo editor para criar as abas com cabeçalhos e exemplo. */
function configurarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const resp = ss.getSheetByName(ABA_RESPONSAVEIS) || ss.insertSheet(ABA_RESPONSAVEIS);
  if (resp.getLastRow() === 0) {
    resp.appendRow(['ID', 'Nome', 'Usuario', 'Senha', 'Email', 'Celular', 'Coordenador']);
    resp.appendRow(['R001', 'Coordenador Exemplo', 'Coordenador.Exemplo', '1234', 'coordenador@exemplo.com', '(11) 90000-0000', true]);
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
/* Utilidades                                                             */
/* ---------------------------------------------------------------------- */

function removerAcentos(txt) {
  return String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function proximoId(sheet, prefixo) {
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

function gerarUsuario(nomeCompleto, usuariosExistentes) {
  const partes = removerAcentos(nomeCompleto).trim().split(/\s+/);
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

function gerarToken() {
  return Utilities.getUuid().replace(/-/g, '');
}

function urlDoApp() {
  return ScriptApp.getService().getUrl();
}

/* ---------------------------------------------------------------------- */
/* Login / Cadastro                                                       */
/* ---------------------------------------------------------------------- */

/** Valida usuário + senha e devolve dados do responsável e das crianças vinculadas. */
function validarLogin(usuario, senha) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dadosResp = ss.getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();

  const usuarioBusca = String(usuario).trim().toLowerCase();
  const senhaBusca = String(senha).trim();

  let respEncontrado = null;
  for (let i = 1; i < dadosResp.length; i++) {
    const [id, nome, usr, senhaPlanilha, email, celular, coordenador] = dadosResp[i];
    if (String(usr).trim().toLowerCase() === usuarioBusca && String(senhaPlanilha).trim() === senhaBusca) {
      respEncontrado = { id, nome, email, celular, coordenador: coordenador === true || String(coordenador).toUpperCase() === 'TRUE' };
      break;
    }
  }

  if (!respEncontrado) {
    return { sucesso: false, mensagem: 'Usuário ou senha incorretos.' };
  }

  return montarRespostaLogin(respEncontrado);
}

function montarRespostaLogin(resp) {
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
    responsavelId: resp.id,
    responsavel: resp.nome,
    coordenador: resp.coordenador,
    criancas: criancas
  };
}

/** Cadastra um novo responsável e seus filhos, e já retorna logado. */
function cadastrarResponsavel(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const respSheet = ss.getSheetByName(ABA_RESPONSAVEIS);
    const criancaSheet = ss.getSheetByName(ABA_CRIANCAS);
    const vincSheet = ss.getSheetByName(ABA_VINCULOS);

    if (!dados.nome || !dados.email || !dados.senha || !dados.filhos || dados.filhos.length === 0) {
      return { sucesso: false, mensagem: 'Preencha nome, e-mail, senha e ao menos um filho.' };
    }

    const usuariosExistentes = respSheet.getDataRange().getValues().slice(1).map(r => r[2]);
    const usuario = gerarUsuario(dados.nome, usuariosExistentes);
    const respId = proximoId(respSheet, 'R');

    respSheet.appendRow([respId, dados.nome, usuario, dados.senha, dados.email, dados.celular || '', false]);

    const criancasCriadas = [];
    dados.filhos.forEach(function (filho) {
      const criancaId = proximoId(criancaSheet, 'C');
      criancaSheet.appendRow([criancaId, filho.nome, filho.funcao]);
      vincSheet.appendRow([respId, criancaId]);
      criancasCriadas.push({ id: criancaId, nome: filho.nome, funcao: filho.funcao });
    });

    try {
      MailApp.sendEmail({
        to: dados.email,
        subject: 'Cadastro realizado — Escala de Coroinhas e Cerimoniários',
        body: 'Olá, ' + dados.nome + '!\n\n' +
          'Seu cadastro na escala de coroinhas e cerimoniários da ' + PARÓQUIA.nome + ' foi realizado com sucesso.\n\n' +
          'Seu usuário de acesso é: ' + usuario + '\n' +
          'Guarde esse usuário — você vai usá-lo para entrar no app junto com a senha que cadastrou.\n\n' +
          'Acesse pelo link: ' + urlDoApp() + '\n\n' +
          PARÓQUIA.nome + '\n' + PARÓQUIA.endereco + '\n' + PARÓQUIA.telefone
      });
    } catch (err) {
      // não bloqueia o cadastro se o envio de e-mail falhar
    }

    return montarRespostaLoginComExtra({ id: respId, nome: dados.nome, coordenador: false }, usuario);
  } finally {
    lock.releaseLock();
  }
}

function montarRespostaLoginComExtra(resp, usuario) {
  const base = montarRespostaLogin(resp);
  base.usuario = usuario;
  return base;
}

/* ---------------------------------------------------------------------- */
/* Recuperação de senha                                                   */
/* ---------------------------------------------------------------------- */

/** Gera um link de redefinição de senha válido por 1 hora e envia por e-mail. */
function solicitarRecuperacaoSenha(usuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const respSheet = ss.getSheetByName(ABA_RESPONSAVEIS);
  const dados = respSheet.getDataRange().getValues();

  const usuarioBusca = String(usuario).trim().toLowerCase();
  let encontrado = null;
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][2]).trim().toLowerCase() === usuarioBusca) {
      encontrado = { id: dados[i][0], nome: dados[i][1], email: dados[i][4] };
      break;
    }
  }

  if (!encontrado) {
    // não revela se o usuário existe ou não
    return { sucesso: true };
  }

  const resetSheet = ss.getSheetByName(ABA_RESET);
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  resetSheet.appendRow([token, encontrado.id, expiraEm, false]);

  const link = urlDoApp() + '?token=' + token;
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resetSheet = ss.getSheetByName(ABA_RESET);
  const dados = resetSheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    const [tk, responsavelId, expiraEm, usado] = dados[i];
    if (tk === token) {
      if (usado === true || String(usado).toUpperCase() === 'TRUE') {
        return { sucesso: false, mensagem: 'Esse link já foi utilizado. Solicite um novo.' };
      }
      if (new Date(expiraEm) < new Date()) {
        return { sucesso: false, mensagem: 'Esse link expirou. Solicite um novo.' };
      }
      if (!novaSenha || novaSenha.length < 4) {
        return { sucesso: false, mensagem: 'A senha deve ter ao menos 4 caracteres.' };
      }

      const respSheet = ss.getSheetByName(ABA_RESPONSAVEIS);
      const respDados = respSheet.getDataRange().getValues();
      for (let j = 1; j < respDados.length; j++) {
        if (String(respDados[j][0]) === String(responsavelId)) {
          respSheet.getRange(j + 1, 4).setValue(novaSenha);
          break;
        }
      }
      resetSheet.getRange(i + 1, 4).setValue(true);
      return { sucesso: true };
    }
  }
  return { sucesso: false, mensagem: 'Link inválido.' };
}

/* ---------------------------------------------------------------------- */
/* Missas — visão dos responsáveis                                        */
/* ---------------------------------------------------------------------- */

function lerMissasBrutas() {
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

function listarMissas() {
  return lerMissasBrutas();
}

function inscrever(linha, criancaId, funcao) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
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

    ids.push(criancaId);
    sheet.getRange(linha, colLista).setValue(ids.join(', '));
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

function cancelar(linha, criancaId, funcao) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
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
/* Painel do coordenador                                                  */
/* ---------------------------------------------------------------------- */

function mapaCriancas() {
  const dados = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_CRIANCAS).getDataRange().getValues();
  const mapa = {};
  for (let i = 1; i < dados.length; i++) {
    const [id, nome, funcao] = dados[i];
    if (id) mapa[id] = { nome, funcao };
  }
  return mapa;
}

/** Lista todas as crianças cadastradas (uso do coordenador, para escalar manualmente). */
function listarCriancas() {
  const dados = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_CRIANCAS).getDataRange().getValues();
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    const [id, nome, funcao] = dados[i];
    if (id) lista.push({ id: id, nome: nome, funcao: funcao });
  }
  lista.sort((a, b) => a.nome.localeCompare(b.nome));
  return lista;
}

/** Como listarMissas(), mas com nomes das crianças resolvidos (uso do coordenador). */
function listarMissasParaCoordenador() {
  const missas = lerMissasBrutas();
  const criancas = mapaCriancas();

  return missas.map(function (m) {
    return Object.assign({}, m, {
      coroinhasNomes: m.coroinhas.map(id => (criancas[id] ? criancas[id].nome : '(?)')),
      cerimoniariosNomes: m.cerimoniarios.map(id => (criancas[id] ? criancas[id].nome : '(?)')),
      abaixoMinCoroinha: m.coroinhas.length < m.minCoroinha,
      abaixoMinCerimoniario: m.cerimoniarios.length < m.minCerimoniario
    });
  });
}

function obterResumoCoordenador() {
  const missas = lerMissasBrutas(); // já vem só com futuras, ordenadas
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

function montarMensagemChamada(dados) {
  const descricaoTexto = dados.descricao ? (' (' + dados.descricao + ')') : '';
  return TEMPLATE_MENSAGEM_CHAMADA
    .replace('{responsavel}', dados.responsavel)
    .replace('{funcao}', dados.funcao)
    .replace('{diaSemana}', dados.diaSemana)
    .replace('{data}', dados.data)
    .replace('{horario}', dados.horario)
    .replace('{descricaoTexto}', descricaoTexto)
    .replace('{crianca}', dados.crianca)
    .replace('{paroquia}', PARÓQUIA.nome);
}

function formatarTelefoneWhatsApp(celular) {
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
function obterResponsaveisParaChamar(linha, funcao) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const missas = lerMissasBrutas();
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

      const telefone = formatarTelefoneWhatsApp(resp.celular);
      const item = {
        criancaNome: crianca.nome,
        responsavelNome: resp.nome,
        semCelular: !telefone
      };
      if (telefone) {
        const mensagem = montarMensagemChamada({
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
function gerarMissasRecorrentes(config) {
  const diaIndex = DIAS_SEMANA.indexOf(config.diaSemana);
  if (diaIndex === -1) return { sucesso: false, mensagem: 'Dia da semana inválido.' };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let proxima = new Date(hoje);
  while (proxima.getDay() !== diaIndex) {
    proxima.setDate(proxima.getDate() + 1);
  }

  const semanas = Math.max(1, Number(config.semanas) || 1);
  let criadas = 0;
  for (let i = 0; i < semanas; i++) {
    const data = new Date(proxima);
    data.setDate(data.getDate() + i * 7);
    sheet.appendRow([
      data, config.horario, config.descricao || '',
      Number(config.minCoroinha) || 0, Number(config.maxCoroinha) || 0, '',
      Number(config.minCerimoniario) || 0, Number(config.maxCerimoniario) || 0, ''
    ]);
    criadas++;
  }

  return { sucesso: true, criadas: criadas };
}

function editarMissa(linha, dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS);
    if (dados.horario) sheet.getRange(linha, 2).setValue(dados.horario);
    if (dados.descricao !== undefined) sheet.getRange(linha, 3).setValue(dados.descricao);
    if (dados.minCoroinha !== undefined) sheet.getRange(linha, 4).setValue(Number(dados.minCoroinha) || 0);
    if (dados.maxCoroinha !== undefined) sheet.getRange(linha, 5).setValue(Number(dados.maxCoroinha) || 0);
    if (dados.minCerimoniario !== undefined) sheet.getRange(linha, 7).setValue(Number(dados.minCerimoniario) || 0);
    if (dados.maxCerimoniario !== undefined) sheet.getRange(linha, 8).setValue(Number(dados.maxCerimoniario) || 0);
    return { sucesso: true };
  } finally {
    lock.releaseLock();
  }
}

function excluirMissa(linha) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_MISSAS).deleteRow(linha);
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
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarLembretes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('enviarLembretes').timeBased().everyDays(1).atHour(9).create();
}

/** Envia lembretes das missas de daqui a 3 dias. Pode ser chamado manualmente também. */
function enviarLembretes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const missas = ss.getSheetByName(ABA_MISSAS).getDataRange().getValues();
  const criancas = mapaCriancas();
  const vinculos = ss.getSheetByName(ABA_VINCULOS).getDataRange().getValues();
  const responsaveis = ss.getSheetByName(ABA_RESPONSAVEIS).getDataRange().getValues();

  const responsavelPorId = {};
  const coordenadores = [];
  for (let i = 1; i < responsaveis.length; i++) {
    const [id, nome, usuario, senha, email, celular, coordenador] = responsaveis[i];
    responsavelPorId[id] = { nome, email };
    if (coordenador === true || String(coordenador).toUpperCase() === 'TRUE') {
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


function testeMissas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ABA_MISSAS);
  Logger.log('Aba encontrada: %s', sheet ? sheet.getName() : 'NULL - nome não bate!');
  if (!sheet) return;
  const dados = sheet.getDataRange().getValues();
  Logger.log('Linhas: %s', dados.length);
  Logger.log(JSON.stringify(dados));
  try {
    Logger.log(JSON.stringify(lerMissasBrutas()));
  } catch (e) {
    Logger.log('ERRO em lerMissasBrutas: ' + e.message);
  }
}

/** Gera dados de teste para Vinculos e Missas a partir do que já existe em Responsaveis e Criancas.
 *  Roda uma vez pelo editor do Apps Script (selecione a função e clique em Executar). */
function gerarDadosTeste() {
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
  const tz = Session.getScriptTimeZone();
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
  const dataUrgente = new Date(); dataUrgente.setDate(dataUrgente.getDate() + 2); dataUrgente.setHours(0,0,0,0);
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