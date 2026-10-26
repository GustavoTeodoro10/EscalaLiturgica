import {
  administracaoDeServidor,
  cadastroParaServidor,
  contatoDeServidor,
  eventosDeServidor,
  limitesParaServidor,
  membroDaPastoralDeServidor,
  pastoraisPublicasDeServidor,
  resumoDeServidor,
  sessaoDeLogin,
} from '@/services/adapters';
import type {
  Administracao,
  ConfigGeracao,
  Contato,
  Evento,
  LimitesVaga,
  MembroDaPastoral,
  NovaPastoral,
  NovoCadastro,
  PastoralPublica,
  ResumoPainel,
  Sessao,
} from '@/types';

// URL da implantação "App da Web" do Apps Script (termina em /exec). Definida em .env / na Vercel.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TEMPO_LIMITE_MS = 25_000; // o Apps Script pode demorar alguns segundos na primeira chamada

export type CodigoErro =
  | 'SESSAO_INVALIDA'
  | 'SEM_PERMISSAO'
  | 'ACAO_INVALIDA'
  | 'REQUISICAO_INVALIDA'
  | 'ERRO_INTERNO'
  | 'REDE'
  | 'CONFIGURACAO';

export class ApiError extends Error {
  codigo: CodigoErro;

  constructor(codigo: CodigoErro) {
    super(codigo);
    this.name = 'ApiError';
    this.codigo = codigo;
  }
}

type Resposta<T> = { ok: true; dados: T } | { ok: false; erro: string };

async function chamar<T>(acao: string, args: unknown[]): Promise<T> {
  if (!API_URL) throw new ApiError('CONFIGURACAO');

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  let corpo: Resposta<T>;
  try {
    const resposta = await fetch(API_URL, {
      method: 'POST',
      // text/plain evita o "preflight" de CORS, que o Apps Script não responde
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ acao, args }),
      signal: controle.signal,
    });
    corpo = (await resposta.json()) as Resposta<T>;
  } catch (erro) {
    if (erro instanceof SyntaxError) throw new ApiError('ERRO_INTERNO');
    throw new ApiError('REDE');
  } finally {
    clearTimeout(relogio);
  }

  if (!corpo.ok) {
    const conhecidos: CodigoErro[] = ['SESSAO_INVALIDA', 'SEM_PERMISSAO', 'ACAO_INVALIDA', 'REQUISICAO_INVALIDA'];
    throw new ApiError(conhecidos.find((c) => c === corpo.erro) ?? 'ERRO_INTERNO');
  }
  return corpo.dados;
}

export type ResultadoLogin = { sucesso: true; sessao: Sessao } | { sucesso: false; mensagem: string };
export type ResultadoAcao = { sucesso: boolean; mensagem?: string };
export type ResultadoCadastro =
  | { sucesso: true; sessao: Sessao; usuario: string }
  | { sucesso: false; mensagem: string };

type LoginBruto = { sucesso: boolean; mensagem?: string; usuario?: string };

function paraResultadoLogin(bruto: LoginBruto): ResultadoLogin {
  if (bruto.sucesso) return { sucesso: true, sessao: sessaoDeLogin(bruto) };
  return { sucesso: false, mensagem: bruto.mensagem ?? 'Usuário ou senha incorretos.' };
}

export const api = {
  /* ---------- acesso ---------- */

  async login(usuario: string, senha: string): Promise<ResultadoLogin> {
    return paraResultadoLogin(await chamar<LoginBruto>('validarLogin', [usuario, senha]));
  },

  async validarSessao(token: string): Promise<ResultadoLogin> {
    return paraResultadoLogin(await chamar<LoginBruto>('validarSessao', [token]));
  },

  async cadastrar(dados: NovoCadastro): Promise<ResultadoCadastro> {
    const bruto = await chamar<LoginBruto>('cadastrarResponsavel', [cadastroParaServidor(dados)]);
    if (!bruto.sucesso) return { sucesso: false, mensagem: bruto.mensagem ?? 'Não foi possível concluir o cadastro.' };
    return { sucesso: true, sessao: sessaoDeLogin(bruto), usuario: bruto.usuario ?? '' };
  },

  /** Pastorais ativas e suas funções (tela de cadastro, antes do login). */
  async listarPastorais(): Promise<PastoralPublica[]> {
    return pastoraisPublicasDeServidor(await chamar<unknown>('listarPastoraisPublico', []));
  },

  /** Sempre "sucesso": o servidor não revela se o usuário existe. */
  async solicitarRecuperacao(usuario: string): Promise<void> {
    await chamar<{ sucesso: boolean }>('solicitarRecuperacaoSenha', [usuario]);
  },

  redefinirSenha(token: string, novaSenha: string): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('redefinirSenha', [token, novaSenha]);
  },

  /* ---------- responsáveis e membros ---------- */

  async listarEventos(token: string): Promise<Evento[]> {
    return eventosDeServidor(await chamar<unknown>('listarMissas', [token]));
  },

  inscrever(token: string, eventoId: string, pessoaId: string, funcaoId: string): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('inscrever', [token, eventoId, pessoaId, funcaoId]);
  },

  cancelar(token: string, eventoId: string, pessoaId: string, funcaoId: string): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('cancelar', [token, eventoId, pessoaId, funcaoId]);
  },

  /** A pessoa pede para participar de uma função; fica pendente até o coordenador aprovar. */
  solicitarEntrada(token: string, pessoaId: string, funcaoId: string): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('solicitarEntrada', [token, pessoaId, funcaoId]);
  },

  /* ---------- coordenação (por pastoral) ---------- */

  async obterResumo(token: string, pastoralId: string): Promise<ResumoPainel> {
    return resumoDeServidor(await chamar<unknown>('obterResumoCoordenador', [token, pastoralId]));
  },

  /** Missas com as vagas da pastoral e os nomes de quem está escalado. */
  async listarEventosDetalhados(token: string, pastoralId: string): Promise<Evento[]> {
    return eventosDeServidor(await chamar<unknown>('listarMissasParaCoordenador', [token, pastoralId]));
  },

  async listarMembros(token: string, pastoralId: string): Promise<MembroDaPastoral[]> {
    const lista = await chamar<unknown[]>('listarMembros', [token, pastoralId]);
    return lista.map(membroDaPastoralDeServidor).filter((m): m is MembroDaPastoral => m !== null);
  },

  decidirEntrada(
    token: string,
    pastoralId: string,
    pessoaId: string,
    funcaoId: string,
    aprovar: boolean,
  ): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('decidirEntrada', [token, pastoralId, { pessoaId, funcaoId, aprovar }]);
  },

  removerMembro(token: string, pastoralId: string, pessoaId: string, funcaoId: string): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('removerMembro', [token, pastoralId, { pessoaId, funcaoId }]);
  },

  ajustarVagas(token: string, pastoralId: string, eventoId: string, limites: LimitesVaga[]): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('ajustarVagas', [token, pastoralId, eventoId, limitesParaServidor(limites)]);
  },

  async listarContatos(token: string, pastoralId: string, eventoId: string, funcaoId: string): Promise<Contato[]> {
    const lista = await chamar<unknown[]>('obterResponsaveisParaChamar', [token, pastoralId, eventoId, funcaoId]);
    return lista.map(contatoDeServidor).filter((c): c is Contato => c !== null);
  },

  async enviarLembretes(token: string, pastoralId: string): Promise<number> {
    const r = await chamar<{ sucesso: boolean; avisados?: number }>('enviarLembretesCoordenador', [token, pastoralId]);
    return Number(r.avisados) || 0;
  },

  /* ---------- administração ---------- */

  async obterAdministracao(token: string): Promise<Administracao> {
    return administracaoDeServidor(await chamar<unknown>('obterAdministracao', [token]));
  },

  criarPastoral(token: string, dados: NovaPastoral): Promise<ResultadoAcao & { id?: string }> {
    return chamar<ResultadoAcao & { id?: string }>('criarPastoral', [token, dados]);
  },

  editarPastoral(
    token: string,
    pastoralId: string,
    dados: {
      nome?: string;
      coordenadorId?: string;
      ativa?: boolean;
      exigeResponsavel?: boolean;
      funcoes?: { id?: string; nome: string; minimo: number; maximo: number }[];
    },
  ): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('editarPastoral', [token, pastoralId, dados]);
  },

  /** `data` no formato yyyy-MM-dd. */
  criarMissa(token: string, dados: { data: string; horario: string; descricao: string }): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('criarMissa', [token, dados]);
  },

  gerarMissas(token: string, config: ConfigGeracao): Promise<ResultadoAcao & { criadas?: number; ignoradas?: number }> {
    return chamar<ResultadoAcao & { criadas?: number; ignoradas?: number }>('gerarMissasRecorrentes', [token, config]);
  },

  editarMissa(token: string, eventoId: string, dados: { horario: string; descricao: string }): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('editarMissa', [token, eventoId, dados]);
  },

  /** `dataEsperada` garante que o id ainda é a missa que a pessoa viu. */
  excluirMissa(token: string, eventoId: string, dataEsperada: string): Promise<ResultadoAcao> {
    return chamar<ResultadoAcao>('excluirMissa', [token, eventoId, dataEsperada]);
  },
};

/** Texto amigável para mostrar ao usuário. */
export function mensagemDeErro(erro: unknown): string {
  const codigo = erro instanceof ApiError ? erro.codigo : 'ERRO_INTERNO';
  switch (codigo) {
    case 'REDE':
      return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
    case 'SESSAO_INVALIDA':
      return 'Sua sessão expirou. Entre novamente.';
    case 'SEM_PERMISSAO':
      return 'Você não tem permissão para isso.';
    case 'CONFIGURACAO':
      return 'O app ainda não está configurado com o endereço do servidor.';
    default:
      return 'Algo deu errado. Tente novamente em instantes.';
  }
}
