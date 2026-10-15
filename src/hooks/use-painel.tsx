import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useEventos } from '@/hooks/use-eventos';
import { useSession } from '@/hooks/use-session';
import { api, ApiError, mensagemDeErro } from '@/services/api';
import type { Contato, Evento, LimitesVaga, MembroDaPastoral, PastoralRef, ResumoPainel } from '@/types';

type DadosPainel = { resumo: ResumoPainel; eventos: Evento[]; membros: MembroDaPastoral[] };

type ContextoPainel = {
  pastoral: PastoralRef;
  resumo: ResumoPainel | null;
  /** missas futuras com as vagas da pastoral e os nomes de quem está escalado */
  eventos: Evento[] | null;
  /** membros e pedidos de entrada da pastoral */
  membros: MembroDaPastoral[];
  erro: string | null;
  atualizando: boolean;
  recarregar: () => Promise<void>;
  /** Aumenta a cada escrita concluída. Quem mostra dados derivados (ex.: lista de contatos) usa como `key`. */
  versao: number;
  /** As ações devolvem null se deu certo, ou a mensagem para mostrar. */
  escalar: (eventoId: string, pessoaId: string, funcaoId: string) => Promise<string | null>;
  remover: (eventoId: string, pessoaId: string, funcaoId: string) => Promise<string | null>;
  ajustarVagas: (eventoId: string, limites: LimitesVaga[]) => Promise<string | null>;
  decidirEntrada: (pessoaId: string, funcaoId: string, aprovar: boolean) => Promise<string | null>;
  removerMembro: (pessoaId: string, funcaoId: string) => Promise<string | null>;
  contatos: (eventoId: string, funcaoId: string) => Promise<{ erro: string | null; lista: Contato[] }>;
  enviarLembretes: () => Promise<{ erro: string | null; avisados: number }>;
};

const Contexto = createContext<ContextoPainel | null>(null);

async function buscarTudo(token: string, pastoralId: string): Promise<DadosPainel> {
  const [resumo, eventos, membros] = await Promise.all([
    api.obterResumo(token, pastoralId),
    api.listarEventosDetalhados(token, pastoralId),
    api.listarMembros(token, pastoralId),
  ]);
  return { resumo, eventos, membros };
}

/** Dados e ações do Painel de UMA pastoral. Montado (com `key` = pastoral) só dentro da tela Painel. */
export function PainelProvider({ pastoral, children }: { pastoral: PastoralRef; children: ReactNode }) {
  const { sessao, sair, recarregarSessao } = useSession();
  const { recarregar: recarregarAgendaDosPais } = useEventos();
  const token = sessao?.token ?? null;
  const pastoralId = pastoral.id;

  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [versao, setVersao] = useState(0);
  const ultimaBusca = useRef(0);

  const tratarErro = useCallback(
    (e: unknown): string => {
      if (e instanceof ApiError && e.codigo === 'SESSAO_INVALIDA') void sair();
      return mensagemDeErro(e);
    },
    [sair],
  );

  // Carga inicial: o estado só muda dentro dos callbacks da promessa.
  useEffect(() => {
    if (!token) return;
    const numero = ++ultimaBusca.current;
    buscarTudo(token, pastoralId)
      .then((novos) => {
        if (numero !== ultimaBusca.current) return;
        setDados(novos);
        setErro(null);
      })
      .catch((e: unknown) => {
        if (numero !== ultimaBusca.current) return;
        setErro(tratarErro(e));
      });
  }, [token, pastoralId, tratarErro]);

  const recarregar = useCallback(async () => {
    if (!token) return;
    const numero = ++ultimaBusca.current;
    setAtualizando(true);
    try {
      const novos = await buscarTudo(token, pastoralId);
      if (numero !== ultimaBusca.current) return;
      setDados(novos);
      setErro(null);
    } catch (e) {
      if (numero !== ultimaBusca.current) return;
      setErro(tratarErro(e));
    } finally {
      if (numero === ultimaBusca.current) setAtualizando(false);
    }
  }, [token, pastoralId, tratarErro]);

  /** Executa uma escrita e atualiza o painel e a agenda dos pais (que mostram os mesmos dados). */
  const escrever = useCallback(
    async (acao: (t: string) => Promise<{ sucesso: boolean; mensagem?: string }>) => {
      if (!token) return 'Sua sessão expirou. Entre novamente.';
      try {
        const resultado = await acao(token);
        await Promise.all([recarregar(), recarregarAgendaDosPais(), recarregarSessao()]);
        setVersao((v) => v + 1);
        return resultado.sucesso ? null : (resultado.mensagem ?? 'Não foi possível concluir.');
      } catch (e) {
        return tratarErro(e);
      }
    },
    [token, recarregar, recarregarAgendaDosPais, recarregarSessao, tratarErro],
  );

  const escalar = useCallback(
    (eventoId: string, pessoaId: string, funcaoId: string) =>
      escrever((t) => api.inscrever(t, eventoId, pessoaId, funcaoId)),
    [escrever],
  );
  const remover = useCallback(
    (eventoId: string, pessoaId: string, funcaoId: string) =>
      escrever((t) => api.cancelar(t, eventoId, pessoaId, funcaoId)),
    [escrever],
  );
  const ajustarVagas = useCallback(
    (eventoId: string, limites: LimitesVaga[]) => escrever((t) => api.ajustarVagas(t, pastoralId, eventoId, limites)),
    [escrever, pastoralId],
  );
  const decidirEntrada = useCallback(
    (pessoaId: string, funcaoId: string, aprovar: boolean) =>
      escrever((t) => api.decidirEntrada(t, pastoralId, pessoaId, funcaoId, aprovar)),
    [escrever, pastoralId],
  );
  const removerMembro = useCallback(
    (pessoaId: string, funcaoId: string) => escrever((t) => api.removerMembro(t, pastoralId, pessoaId, funcaoId)),
    [escrever, pastoralId],
  );

  const contatos = useCallback(
    async (eventoId: string, funcaoId: string) => {
      if (!token) return { erro: 'Sua sessão expirou. Entre novamente.', lista: [] };
      try {
        return { erro: null, lista: await api.listarContatos(token, pastoralId, eventoId, funcaoId) };
      } catch (e) {
        return { erro: tratarErro(e), lista: [] };
      }
    },
    [token, pastoralId, tratarErro],
  );

  const enviarLembretes = useCallback(async () => {
    if (!token) return { erro: 'Sua sessão expirou. Entre novamente.', avisados: 0 };
    try {
      return { erro: null, avisados: await api.enviarLembretes(token, pastoralId) };
    } catch (e) {
      return { erro: tratarErro(e), avisados: 0 };
    }
  }, [token, pastoralId, tratarErro]);

  return (
    <Contexto.Provider
      value={{
        pastoral,
        resumo: dados?.resumo ?? null,
        eventos: dados?.eventos ?? null,
        membros: dados?.membros ?? [],
        erro,
        atualizando,
        recarregar,
        versao,
        escalar,
        remover,
        ajustarVagas,
        decidirEntrada,
        removerMembro,
        contatos,
        enviarLembretes,
      }}>
      {children}
    </Contexto.Provider>
  );
}

export function usePainel() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('usePainel precisa estar dentro de <PainelProvider>');
  return contexto;
}
