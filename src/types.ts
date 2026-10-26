// Tipos do domínio do app (multi-pastoral). O servidor devolve estes mesmos formatos; src/services/adapters.ts
// valida e normaliza a resposta antes de ela chegar às telas. Ver docs/MULTI-PASTORAL-CONTRATO.md.

/* ---------- pessoas e participação ---------- */

export type Situacao = 'ativo' | 'pendente';

/** Participação de uma pessoa em uma função de uma pastoral. */
export type Membro = {
  pastoralId: string;
  pastoral: string;
  funcaoId: string;
  funcao: string;
  situacao: Situacao;
};

/** Quem serve: uma criança vinculada ao responsável, ou o próprio responsável (adulto). */
export type Pessoa = {
  id: string; // C001…
  nome: string;
  tipo: 'crianca' | 'adulto';
  membros: Membro[];
};

export type PastoralRef = { id: string; nome: string };

export type Sessao = {
  token: string;
  responsavelId: string; // R001…
  responsavel: string;
  /** cria missas e pastorais; não vê pessoas */
  administrador: boolean;
  /** pastorais que esta pessoa coordena */
  pastoraisCoordenadas: PastoralRef[];
  pessoas: Pessoa[];
};

/* ---------- missas e vagas ---------- */

/** Vagas de uma função (de uma pastoral) em uma missa. */
export type Vaga = {
  funcaoId: string;
  funcao: string;
  pastoralId: string;
  pastoral: string;
  minimo: number;
  maximo: number;
  /** ids de Pessoa escaladas */
  escalados: string[];
  /** nomes, na mesma ordem de `escalados`; só vem na visão do coordenador */
  nomes?: string[];
};

/** Um compromisso com vagas (hoje, sempre uma missa). */
export type Evento = {
  /** identificador opaco: o app nunca interpreta */
  id: string;
  data: string; // dd/MM/yyyy
  horario: string; // HH:mm
  descricao: string;
  vagas: Vaga[];
};

/** Limites de uma função em uma missa (coordenador) ou padrão da função (administrador). */
export type LimitesVaga = { funcaoId: string; funcao: string; minimo: number; maximo: number };

/* ---------- coordenação ---------- */

export type ResumoVaga = { funcaoId: string; funcao: string; ocupadas: number; minimo: number; maximo: number };

export type AlertaUrgente = {
  eventoId: string;
  data: string;
  horario: string;
  diaSemana: string;
  ocupacaoPct: number;
  vagas: { funcaoId: string; funcao: string; ocupadas: number; maximo: number }[];
};

export type ResumoPainel = {
  pastoral: PastoralRef;
  missasAbaixoDoMinimo: number;
  vagasAbertas7dias: number;
  taxaOcupacao: number;
  totalMembros: number;
  pendentes: number;
  proximo: {
    data: string;
    horario: string;
    diaSemana: string;
    descricao: string;
    vagas: ResumoVaga[];
  } | null;
  alertas: AlertaUrgente[];
};

/** Membro (ou pedido de entrada) de uma pastoral, na visão do coordenador. */
export type MembroDaPastoral = {
  pessoaId: string;
  nome: string;
  tipo: 'crianca' | 'adulto';
  /** idade em anos; null quando o cadastro é antigo e não tem data de nascimento */
  idade: number | null;
  funcaoId: string;
  funcao: string;
  situacao: Situacao;
  responsavel: string;
};

/** Pessoa livre, com o link do WhatsApp do responsável pronto (quando há celular). */
export type Contato = {
  pessoaNome: string;
  responsavelNome: string;
  semCelular: boolean;
  link: string | null;
};

/* ---------- administração ---------- */

export type FuncaoAdmin = { id: string; nome: string; minimo: number; maximo: number };

export type PastoralAdmin = {
  id: string;
  nome: string;
  ativa: boolean;
  /** o cadastro de quem serve nessa pastoral pede os dados do responsável e da criança (ex.: coroinhas) */
  exigeResponsavel: boolean;
  coordenadorId: string;
  coordenador: string;
  funcoes: FuncaoAdmin[];
};

export type MissaAdmin = {
  id: string;
  data: string;
  diaSemana: string;
  horario: string;
  descricao: string;
  /** só contagens: o administrador não vê nomes */
  pastorais: { pastoralId: string; pastoral: string; escalados: number; maximo: number }[];
};

export type Administracao = {
  pastorais: PastoralAdmin[];
  usuarios: { id: string; nome: string }[];
  missas: MissaAdmin[];
};

export type DiaSemana = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';

export type ConfigGeracao = {
  diaSemana: DiaSemana;
  horario: string;
  semanas: number;
  descricao: string;
};

export type NovaPastoral = {
  nome: string;
  coordenadorId: string;
  exigeResponsavel: boolean;
  funcoes: { nome: string; minimo: number; maximo: number }[];
};

/* ---------- cadastro ---------- */

export type PastoralPublica = {
  id: string;
  nome: string;
  /** quem serve aqui pode ser uma criança, então o cadastro pergunta pelos filhos (ex.: coroinhas) */
  exigeResponsavel: boolean;
  funcoes: { id: string; nome: string }[];
};

export type Escolha = { pastoralId: string; funcaoId: string };

export type NovoCadastro = {
  nome: string;
  email: string;
  celular: string;
  senha: string;
  /** nascimento do responsável, "AAAA-MM-DD" */
  nascimento: string;
  /** funções em que o próprio responsável serve (vazio se ele só cadastra os filhos) */
  euSirvo: Escolha[];
  filhos: { nome: string; nascimento: string; pastoralId: string; funcaoId: string }[];
};
