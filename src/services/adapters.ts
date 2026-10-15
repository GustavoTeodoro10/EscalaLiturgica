// Valida e normaliza o que o servidor (Apps Script) devolve antes de chegar às telas, e monta o que ele recebe.
// A resposta vem de JSON e de uma planilha editável por pessoas: nada aqui assume que os campos existem.
// Os formatos estão em docs/MULTI-PASTORAL-CONTRATO.md.
import type {
  Administracao,
  AlertaUrgente,
  Contato,
  Evento,
  FuncaoAdmin,
  LimitesVaga,
  Membro,
  MembroDaPastoral,
  MissaAdmin,
  NovoCadastro,
  PastoralAdmin,
  PastoralPublica,
  Pessoa,
  ResumoPainel,
  ResumoVaga,
  Sessao,
  Situacao,
  Vaga,
} from '@/types';

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};
}

function texto(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function lista<T>(v: unknown, converter: (item: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const saida: T[] = [];
  for (const item of v) {
    const convertido = converter(item);
    if (convertido !== null) saida.push(convertido);
  }
  return saida;
}

function situacao(v: unknown): Situacao {
  return v === 'pendente' ? 'pendente' : 'ativo';
}

/* ---------- servidor -> domínio ---------- */

function membroDeServidor(item: unknown): Membro | null {
  const m = obj(item);
  if (!m.pastoralId || !m.funcaoId) return null;
  return {
    pastoralId: texto(m.pastoralId),
    pastoral: texto(m.pastoral),
    funcaoId: texto(m.funcaoId),
    funcao: texto(m.funcao),
    situacao: situacao(m.situacao),
  };
}

function pessoaDeServidor(item: unknown): Pessoa | null {
  const p = obj(item);
  // vínculo apontando para pessoa removida da planilha: ignora em vez de quebrar a tela
  if (!p.id || !p.nome) return null;
  return {
    id: texto(p.id),
    nome: texto(p.nome),
    tipo: p.tipo === 'adulto' ? 'adulto' : 'crianca',
    membros: lista(p.membros, membroDeServidor),
  };
}

export function sessaoDeLogin(bruto: unknown): Sessao {
  const l = obj(bruto);
  return {
    token: texto(l.token),
    responsavelId: texto(l.responsavelId),
    responsavel: texto(l.responsavel),
    administrador: l.administrador === true,
    pastoraisCoordenadas: lista(l.pastoraisCoordenadas, (x) => {
      const p = obj(x);
      return p.id ? { id: texto(p.id), nome: texto(p.nome) } : null;
    }),
    pessoas: lista(l.pessoas, pessoaDeServidor),
  };
}

function vagaDeServidor(item: unknown): Vaga | null {
  const v = obj(item);
  if (!v.funcaoId) return null;
  const nomes = Array.isArray(v.nomes) ? v.nomes.map(texto) : undefined;
  return {
    funcaoId: texto(v.funcaoId),
    funcao: texto(v.funcao),
    pastoralId: texto(v.pastoralId),
    pastoral: texto(v.pastoral),
    minimo: numero(v.minimo),
    maximo: numero(v.maximo),
    escalados: Array.isArray(v.escalados) ? v.escalados.map(texto) : [],
    ...(nomes ? { nomes } : {}),
  };
}

export function eventoDeServidor(item: unknown): Evento | null {
  const e = obj(item);
  if (!e.id) return null;
  return {
    id: texto(e.id),
    data: texto(e.data),
    horario: texto(e.horario),
    descricao: texto(e.descricao),
    vagas: lista(e.vagas, vagaDeServidor),
  };
}

export function eventosDeServidor(bruto: unknown): Evento[] {
  return lista(bruto, eventoDeServidor);
}

function resumoVaga(item: unknown): ResumoVaga | null {
  const v = obj(item);
  if (!v.funcaoId) return null;
  return {
    funcaoId: texto(v.funcaoId),
    funcao: texto(v.funcao),
    ocupadas: numero(v.ocupadas),
    minimo: numero(v.minimo),
    maximo: numero(v.maximo),
  };
}

export function resumoDeServidor(bruto: unknown): ResumoPainel {
  const r = obj(bruto);
  const p = r.proximo === null || r.proximo === undefined ? null : obj(r.proximo);
  const pastoral = obj(r.pastoral);
  return {
    pastoral: { id: texto(pastoral.id), nome: texto(pastoral.nome) },
    missasAbaixoDoMinimo: numero(r.missasAbaixoDoMinimo),
    vagasAbertas7dias: numero(r.vagasAbertas7dias),
    taxaOcupacao: numero(r.taxaOcupacao),
    totalMembros: numero(r.totalMembros),
    pendentes: numero(r.pendentes),
    proximo: p
      ? {
          data: texto(p.data),
          horario: texto(p.horario),
          diaSemana: texto(p.diaSemana),
          descricao: texto(p.descricao),
          vagas: lista(p.vagas, resumoVaga),
        }
      : null,
    alertas: lista(r.alertas, (item): AlertaUrgente | null => {
      const a = obj(item);
      if (!a.eventoId) return null;
      return {
        eventoId: texto(a.eventoId),
        data: texto(a.data),
        horario: texto(a.horario),
        diaSemana: texto(a.diaSemana),
        ocupacaoPct: numero(a.ocupacaoPct),
        vagas: lista(a.vagas, (x) => {
          const v = obj(x);
          return v.funcaoId
            ? { funcaoId: texto(v.funcaoId), funcao: texto(v.funcao), ocupadas: numero(v.ocupadas), maximo: numero(v.maximo) }
            : null;
        }),
      };
    }),
  };
}

const PREFIXO_WHATSAPP = 'https://api.whatsapp.com/send/';

export function contatoDeServidor(item: unknown): Contato | null {
  const c = obj(item);
  // só aceitamos links do WhatsApp: o campo vem de uma planilha editável por pessoas
  const link = typeof c.link === 'string' && c.link.startsWith(PREFIXO_WHATSAPP) ? c.link : null;
  return {
    pessoaNome: texto(c.pessoaNome),
    responsavelNome: texto(c.responsavelNome),
    semCelular: c.semCelular === true || link === null,
    link,
  };
}

export function membroDaPastoralDeServidor(item: unknown): MembroDaPastoral | null {
  const m = obj(item);
  if (!m.pessoaId || !m.funcaoId) return null;
  return {
    pessoaId: texto(m.pessoaId),
    nome: texto(m.nome),
    tipo: m.tipo === 'adulto' ? 'adulto' : 'crianca',
    funcaoId: texto(m.funcaoId),
    funcao: texto(m.funcao),
    situacao: situacao(m.situacao),
    responsavel: texto(m.responsavel),
  };
}

export function pastoraisPublicasDeServidor(bruto: unknown): PastoralPublica[] {
  return lista(bruto, (item) => {
    const p = obj(item);
    if (!p.id) return null;
    return {
      id: texto(p.id),
      nome: texto(p.nome),
      funcoes: lista(p.funcoes, (x) => {
        const f = obj(x);
        return f.id ? { id: texto(f.id), nome: texto(f.nome) } : null;
      }),
    };
  });
}

export function administracaoDeServidor(bruto: unknown): Administracao {
  const a = obj(bruto);
  return {
    pastorais: lista(a.pastorais, (item): PastoralAdmin | null => {
      const p = obj(item);
      if (!p.id) return null;
      return {
        id: texto(p.id),
        nome: texto(p.nome),
        ativa: p.ativa !== false,
        coordenadorId: texto(p.coordenadorId),
        coordenador: texto(p.coordenador),
        funcoes: lista(p.funcoes, (x): FuncaoAdmin | null => {
          const f = obj(x);
          return f.id ? { id: texto(f.id), nome: texto(f.nome), minimo: numero(f.minimo), maximo: numero(f.maximo) } : null;
        }),
      };
    }),
    usuarios: lista(a.usuarios, (x) => {
      const u = obj(x);
      return u.id ? { id: texto(u.id), nome: texto(u.nome) } : null;
    }),
    missas: lista(a.missas, (item): MissaAdmin | null => {
      const m = obj(item);
      if (!m.id) return null;
      return {
        id: texto(m.id),
        data: texto(m.data),
        diaSemana: texto(m.diaSemana),
        horario: texto(m.horario),
        descricao: texto(m.descricao),
        pastorais: lista(m.pastorais, (x) => {
          const p = obj(x);
          return p.pastoralId
            ? { pastoralId: texto(p.pastoralId), pastoral: texto(p.pastoral), escalados: numero(p.escalados), maximo: numero(p.maximo) }
            : null;
        }),
      };
    }),
  };
}

/* ---------- domínio -> servidor ---------- */

export function limitesParaServidor(limites: LimitesVaga[]) {
  return limites.map((l) => ({ funcaoId: l.funcaoId, minimo: l.minimo, maximo: l.maximo }));
}

export function cadastroParaServidor(c: NovoCadastro) {
  return {
    nome: c.nome,
    email: c.email,
    celular: c.celular,
    senha: c.senha,
    euSirvo: c.euSirvo ? { pastoralId: c.euSirvo.pastoralId, funcaoId: c.euSirvo.funcaoId } : null,
    filhos: c.filhos.map((f) => ({ nome: f.nome, pastoralId: f.pastoralId, funcaoId: f.funcaoId })),
  };
}
