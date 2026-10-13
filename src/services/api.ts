import type { Crianca, Missa } from '@/types';

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

export type ResultadoLogin =
  | { sucesso: true; token: string; responsavelId: string; responsavel: string; coordenador: boolean; criancas: Crianca[] }
  | { sucesso: false; mensagem?: string };

export const api = {
  login: (usuario: string, senha: string) => chamar<ResultadoLogin>('validarLogin', [usuario, senha]),
  validarSessao: (token: string) => chamar<ResultadoLogin>('validarSessao', [token]),
  listarMissas: (token: string) => chamar<Missa[]>('listarMissas', [token]),
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
