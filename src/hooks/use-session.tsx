import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, ApiError, mensagemDeErro, type ResultadoLogin } from '@/services/api';
import { apagarToken, lerToken, salvarToken } from '@/services/session-storage';
import type { Sessao } from '@/types';

type ContextoSessao = {
  /** true enquanto o app tenta reabrir a sessão guardada no aparelho */
  carregando: boolean;
  sessao: Sessao | null;
  /** devolve null se entrou, ou a mensagem para mostrar à pessoa */
  entrar: (usuario: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
};

const Contexto = createContext<ContextoSessao | null>(null);

function paraSessao(resultado: ResultadoLogin): Sessao | null {
  if (!resultado.sucesso) return null;
  const { token, responsavelId, responsavel, coordenador, criancas } = resultado;
  return { token, responsavelId, responsavel, coordenador, criancas };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Sessao | null>(null);

  useEffect(() => {
    let ativo = true;

    async function reabrir() {
      const token = await lerToken();
      if (token) {
        try {
          const resultado = await api.validarSessao(token);
          const nova = paraSessao(resultado);
          if (nova) {
            await salvarToken(nova.token); // renova a validade
            if (ativo) setSessao(nova);
          } else {
            await apagarToken();
          }
        } catch (erro) {
          // sem internet não apagamos o token: a pessoa só vê o login desta vez
          if (erro instanceof ApiError && erro.codigo === 'SESSAO_INVALIDA') await apagarToken();
        }
      }
      if (ativo) setCarregando(false);
    }

    reabrir();
    return () => {
      ativo = false;
    };
  }, []);

  // identidade estável: telas usam `sair` como dependência de efeitos
  const entrar = useCallback(async (usuario: string, senha: string) => {
    try {
      const resultado = await api.login(usuario.trim(), senha);
      const nova = paraSessao(resultado);
      if (!nova) {
        return resultado.sucesso ? mensagemDeErro(null) : (resultado.mensagem ?? 'Usuário ou senha incorretos.');
      }
      await salvarToken(nova.token);
      setSessao(nova);
      return null;
    } catch (erro) {
      return mensagemDeErro(erro);
    }
  }, []);

  const sair = useCallback(async () => {
    await apagarToken();
    setSessao(null);
  }, []);

  return <Contexto.Provider value={{ carregando, sessao, entrar, sair }}>{children}</Contexto.Provider>;
}

export function useSession() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return contexto;
}
