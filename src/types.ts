// Modelo de domínio — espelha as planilhas do app atual (Google Sheets).

export type Funcao = 'Coroinha' | 'Cerimoniário';

export type Responsavel = {
  id: string; // R001…
  nome: string;
  email: string;
  celular: string;
  coordenador: boolean;
};

export type Crianca = {
  id: string; // C001…
  nome: string;
  funcao: Funcao;
};

export type Missa = {
  data: string; // yyyy-MM-dd
  horario: string; // HH:mm
  descricao: string;
  coroinhas: { min: number; max: number; escalados: string[] }; // ids de Crianca
  cerimoniarios: { min: number; max: number; escalados: string[] };
};
