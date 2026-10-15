import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, ApiError, mensagemDeErro } from '@/services/api';
import { apagarToken, lerToken, salvarToken } from '@/services/session-storage';
import type { Sessao } from '@/types';

type ContextoSessao = {
  /** true enquanto o app tenta reabrir a sessão guardada no aparelho */
  carregando: boolean;
  sessao: Sessao | null;
  /** devolve null se entrou, ou a mensagem para mostrar à pessoa */
  entrar: (usuario: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  /** Entra com uma sessão que o servidor acabou de devolver (ex.: logo após o cadastro). */
  iniciarSessao: (sessao: Sessao) => Promise<void>;
  /** Relê papéis e participações no servidor (depois de pedir entrada em uma pastoral, por exemplo). */
  recarregarSessao: () => Promise<void>;
};

const Contexto = createContext<ContextoSessao | null>(null);

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
          if (resultado.sucesso) {
            await salvarToken(resultado.sessao.token); // renova a validade
            if (ativo) setSessao(resultado.sessao);
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
      if (!resultado.sucesso) return resultado.mensagem;
      await salvarToken(resultado.sessao.token);
      setSessao(resultado.sessao);
      return null;
    } catch (erro) {
      return mensagemDeErro(erro);
    }
  }, []);

  const sair = useCallback(async () => {
    await apagarToken();
    setSessao(null);
  }, []);

  const iniciarSessao = useCallback(async (nova: Sessao) => {
    await salvarToken(nova.token);
    setSessao(nova);
  }, []);

  const recarregarSessao = useCallback(async () => {
    const token = await lerToken();
    if (!token) return;
    try {
      const resultado = await api.validarSessao(token);
      if (resultado.sucesso) {
        await salvarToken(resultado.sessao.token);
        setSessao(resultado.sessao);
      }
    } catch {
      // sem internet: mantém o que já está na tela
    }
  }, []);

  return (
    <Contexto.Provider value={{ carregando, sessao, entrar, sair, iniciarSessao, recarregarSessao }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSession() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return contexto;
}
