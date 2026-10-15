import type { Evento, Membro, Pessoa, Vaga } from '@/types';

/** Funções em que a pessoa participa de fato (pedidos pendentes ainda não contam). */
export function funcoesAtivasDe(pessoa: Pessoa): Membro[] {
  return pessoa.membros.filter((m) => m.situacao === 'ativo');
}

/** Pedidos de participação que o coordenador ainda não aprovou. */
export function pedidosPendentesDe(pessoa: Pessoa): Membro[] {
  return pessoa.membros.filter((m) => m.situacao === 'pendente');
}

/** Vagas do evento nas funções em que a pessoa participa. */
export function vagasDaPessoa(evento: Evento, pessoa: Pessoa): Vaga[] {
  const funcoes = new Set(funcoesAtivasDe(pessoa).map((m) => m.funcaoId));
  return evento.vagas.filter((v) => funcoes.has(v.funcaoId));
}

export function estaEscalado(evento: Evento, pessoa: Pessoa): boolean {
  return evento.vagas.some((v) => v.escalados.includes(pessoa.id));
}

/** Vagas em que a pessoa pode se inscrever: função dela, com lugar e ela ainda fora. */
export function vagasAbertasPara(evento: Evento, pessoa: Pessoa): Vaga[] {
  return vagasDaPessoa(evento, pessoa).filter(
    (v) => !v.escalados.includes(pessoa.id) && v.escalados.length < v.maximo,
  );
}

export function temVaga(evento: Evento, pessoa: Pessoa): boolean {
  return vagasAbertasPara(evento, pessoa).length > 0;
}

/** Quantas pessoas ainda faltam para atingir o mínimo da vaga. */
export function faltamParaMinimo(vaga: Vaga): number {
  return Math.max(0, vaga.minimo - vaga.escalados.length);
}

/** Datas (dd/MM/yyyy) em que a pessoa tem alguma missa com vaga. */
export function diasComVaga(eventos: Evento[], pessoa: Pessoa): Set<string> {
  const dias = new Set<string>();
  for (const e of eventos) if (temVaga(e, pessoa)) dias.add(e.data);
  return dias;
}

/** Eventos de uma data em que a pessoa pode se inscrever, na ordem recebida (já cronológica). */
export function eventosComVagaNoDia(eventos: Evento[], pessoa: Pessoa, data: string): Evento[] {
  return eventos.filter((e) => e.data === data && temVaga(e, pessoa));
}

/** Primeira data com vaga para a pessoa (a lista do servidor vem em ordem cronológica). */
export function primeiroDiaComVaga(eventos: Evento[], pessoa: Pessoa): string | null {
  return eventos.find((e) => temVaga(e, pessoa))?.data ?? null;
}

export type Compromisso = { evento: Evento; pessoa: Pessoa; vaga: Vaga };

/** Missas em que alguma das pessoas já está escalada, com a função em que serve. */
export function compromissosDe(eventos: Evento[], pessoas: Pessoa[]): Compromisso[] {
  return eventos.flatMap((evento) =>
    pessoas.flatMap((pessoa) =>
      evento.vagas.filter((v) => v.escalados.includes(pessoa.id)).map((vaga) => ({ evento, pessoa, vaga })),
    ),
  );
}

export type GrupoDeCompromissos = { data: string; itens: Compromisso[] };

/** Agrupa por data (dd/MM/yyyy), mantendo a ordem de chegada (já cronológica). */
export function agruparPorData(compromissos: Compromisso[]): GrupoDeCompromissos[] {
  const grupos: GrupoDeCompromissos[] = [];
  for (const c of compromissos) {
    const existente = grupos.find((g) => g.data === c.evento.data);
    if (existente) existente.itens.push(c);
    else grupos.push({ data: c.evento.data, itens: [c] });
  }
  return grupos;
}

/** Texto curto de uma função com a pastoral, para quem participa de mais de uma. */
export function rotuloDaVaga(vaga: Pick<Vaga, 'funcao' | 'pastoral'>, comPastoral: boolean): string {
  return comPastoral && vaga.pastoral ? `${vaga.funcao} · ${vaga.pastoral}` : vaga.funcao;
}
