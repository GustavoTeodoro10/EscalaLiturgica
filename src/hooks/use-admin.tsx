import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useEventos } from '@/hooks/use-eventos';
import { useSession } from '@/hooks/use-session';
import { api, ApiError, mensagemDeErro } from '@/services/api';
import type { Administracao, ConfigGeracao, NovaPastoral } from '@/types';

type FuncaoEdicao = { id?: string; nome: string; minimo: number; maximo: number };

type ContextoAdmin = {
  dados: Administracao | null;
  erro: string | null;
  atualizando: boolean;
  recarregar: () => Promise<void>;
  /** As ações devolvem null se deu certo, ou a mensagem para mostrar. */
  criarMissa: (dados: { data: string; horario: string; descricao: string }) => Promise<string | null>;
  gerarMissas: (config: ConfigGeracao) => Promise<{ erro: string | null; criadas: number; ignoradas: number }>;
  editarMissa: (eventoId: string, dados: { horario: string; descricao: string }) => Promise<string | null>;
  excluirMissa: (eventoId: string, data: string) => Promise<string | null>;
  criarPastoral: (dados: NovaPastoral) => Promise<string | null>;
  editarPastoral: (
    pastoralId: string,
    dados: { nome?: string; coordenadorId?: string; ativa?: boolean; funcoes?: FuncaoEdicao[] },
  ) => Promise<string | null>;
};

const Contexto = createContext<ContextoAdmin | null>(null);

/** Dados e ações do perfil administrativo (missas e pastorais). Montado só dentro da tela Administração. */
export function AdminProvider({ children }: { children: ReactNode }) {
  const { sessao, sair, recarregarSessao } = useSession();
  const { recarregar: recarregarAgenda } = useEventos();
  const token = sessao?.token ?? null;

  const [dados, setDados] = useState<Administracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const ultimaBusca = useRef(0);

  const tratarErro = useCallback(
    (e: unknown): string => {
      if (e instanceof ApiError && e.codigo === 'SESSAO_INVALIDA') void sair();
      return mensagemDeErro(e);
    },
    [sair],
  );

  useEffect(() => {
    if (!token) return;
    const numero = ++ultimaBusca.current;
    api
      .obterAdministracao(token)
      .then((novos) => {
        if (numero !== ultimaBusca.current) return;
        setDados(novos);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (numero !== ultimaBusca.current) return;
        setErro(tratarErro(e));
      });
  }, [token, tratarErro]);

  const recarregar = useCallback(async () => {
    if (!token) return;
    const numero = ++ultimaBusca.current;
    setAtualizando(true);
    try {
      const novos = await api.obterAdministracao(token);
      if (numero !== ultimaBusca.current) return;
      setDados(novos);
      setErro(null);
    } catch (e) {
      if (numero !== ultimaBusca.current) return;
      setErro(tratarErro(e));
    } finally {
      if (numero === ultimaBusca.current) setAtualizando(false);
    }
  }, [token, tratarErro]);

  const escrever = useCallback(
    async (acao: (t: string) => Promise<{ sucesso: boolean; mensagem?: string }>) => {
      if (!token) return 'Sua sessão expirou. Entre novamente.';
      try {
        const resultado = await acao(token);
        // missas e coordenadores mudam o que todos veem
        await Promise.all([recarregar(), recarregarAgenda(), recarregarSessao()]);
        return resultado.sucesso ? null : (resultado.mensagem ?? 'Não foi possível concluir.');
      } catch (e) {
        return tratarErro(e);
      }
    },
    [token, recarregar, recarregarAgenda, recarregarSessao, tratarErro],
  );

  const criarMissa = useCallback(
    (d: { data: string; horario: string; descricao: string }) => escrever((t) => api.criarMissa(t, d)),
    [escrever],
  );

  const gerarMissas = useCallback(
    async (config: ConfigGeracao) => {
      let criadas = 0;
      let ignoradas = 0;
      const erroGeracao = await escrever(async (t) => {
        const r = await api.gerarMissas(t, config);
        criadas = Number(r.criadas) || 0;
        ignoradas = Number(r.ignoradas) || 0;
        return r;
      });
      return { erro: erroGeracao, criadas, ignoradas };
    },
    [escrever],
  );

  const editarMissa = useCallback(
    (eventoId: string, d: { horario: string; descricao: string }) => escrever((t) => api.editarMissa(t, eventoId, d)),
    [escrever],
  );
  const excluirMissa = useCallback(
    (eventoId: string, data: string) => escrever((t) => api.excluirMissa(t, eventoId, data)),
    [escrever],
  );
  const criarPastoral = useCallback((d: NovaPastoral) => escrever((t) => api.criarPastoral(t, d)), [escrever]);
  const editarPastoral = useCallback(
    (
      pastoralId: string,
      d: { nome?: string; coordenadorId?: string; ativa?: boolean; funcoes?: FuncaoEdicao[] },
    ) => escrever((t) => api.editarPastoral(t, pastoralId, d)),
    [escrever],
  );

  return (
    <Contexto.Provider
      value={{
        dados,
        erro,
        atualizando,
        recarregar,
        criarMissa,
        gerarMissas,
        editarMissa,
        excluirMissa,
        criarPastoral,
        editarPastoral,
      }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAdmin() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAdmin precisa estar dentro de <AdminProvider>');
  return contexto;
}
