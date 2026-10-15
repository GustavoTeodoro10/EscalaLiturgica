import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useSession } from '@/hooks/use-session';
import { api, ApiError, mensagemDeErro } from '@/services/api';
import type { Evento, Pessoa } from '@/types';

type ContextoEventos = {
  /** null até a primeira resposta do servidor */
  eventos: Evento[] | null;
  erro: string | null;
  atualizando: boolean;
  recarregar: () => Promise<void>;
  /** devolve null se deu certo, ou a mensagem para mostrar à pessoa */
  inscrever: (eventoId: string, pessoa: Pessoa, funcaoId: string) => Promise<string | null>;
  cancelar: (eventoId: string, pessoa: Pessoa, funcaoId: string) => Promise<string | null>;
};

const Contexto = createContext<ContextoEventos | null>(null);

/** Mantém a lista de missas compartilhada entre as abas (Agenda e Vagas veem os mesmos dados). */
export function EventosProvider({ children }: { children: ReactNode }) {
  const { sessao, sair } = useSession();
  const token = sessao?.token ?? null;

  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const ultimaBusca = useRef(0); // descarta respostas antigas se duas buscas se cruzarem

  const tratarErro = useCallback(
    (e: unknown): string => {
      if (e instanceof ApiError && e.codigo === 'SESSAO_INVALIDA') {
        void sair();
      }
      return mensagemDeErro(e);
    },
    [sair],
  );

  const recarregar = useCallback(async () => {
    if (!token) return;
    const numero = ++ultimaBusca.current;
    setAtualizando(true);
    try {
      const lista = await api.listarEventos(token);
      if (numero !== ultimaBusca.current) return;
      setEventos(lista);
      setErro(null);
    } catch (e) {
      if (numero !== ultimaBusca.current) return;
      setErro(tratarErro(e));
    } finally {
      if (numero === ultimaBusca.current) setAtualizando(false);
    }
  }, [token, tratarErro]);

  // Carga inicial (e quando a pessoa troca). O estado só muda dentro dos callbacks da promessa;
  // `eventos === null` já cobre o indicador de carregamento da primeira vez.
  useEffect(() => {
    if (!token) return;
    const numero = ++ultimaBusca.current;
    api
      .listarEventos(token)
      .then((lista) => {
        if (numero !== ultimaBusca.current) return;
        setEventos(lista);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (numero !== ultimaBusca.current) return;
        setErro(tratarErro(e));
      });
  }, [token, tratarErro]);

  const executar = useCallback(
    async (acao: (t: string) => Promise<{ sucesso: boolean; mensagem?: string }>) => {
      if (!token) return 'Sua sessão expirou. Entre novamente.';
      try {
        const resultado = await acao(token);
        // recarrega mesmo quando o servidor recusou: a lista pode estar desatualizada
        await recarregar();
        return resultado.sucesso ? null : (resultado.mensagem ?? 'Não foi possível concluir.');
      } catch (e) {
        return tratarErro(e);
      }
    },
    [token, recarregar, tratarErro],
  );

  const inscrever = useCallback(
    (eventoId: string, pessoa: Pessoa, funcaoId: string) =>
      executar((t) => api.inscrever(t, eventoId, pessoa.id, funcaoId)),
    [executar],
  );

  const cancelar = useCallback(
    (eventoId: string, pessoa: Pessoa, funcaoId: string) =>
      executar((t) => api.cancelar(t, eventoId, pessoa.id, funcaoId)),
    [executar],
  );

  return (
    <Contexto.Provider value={{ eventos, erro, atualizando, recarregar, inscrever, cancelar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useEventos() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useEventos precisa estar dentro de <EventosProvider>');
  return contexto;
}
