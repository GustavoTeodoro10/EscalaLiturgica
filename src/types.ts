// Formatos devolvidos pela API do Apps Script (apps-script/Código.js).

export type Funcao = 'Coroinha' | 'Cerimoniário';

export type Crianca = {
  id: string; // C001…
  nome: string;
  funcao: Funcao;
};

export type Sessao = {
  token: string;
  responsavelId: string; // R001…
  responsavel: string;
  coordenador: boolean;
  criancas: Crianca[];
};

export type Missa = {
  linha: number; // linha na planilha: identifica a missa nas chamadas de escrita
  data: string; // dd/MM/yyyy
  horario: string; // HH:mm
  descricao: string;
  minCoroinha: number;
  maxCoroinha: number;
  coroinhas: string[]; // ids de Crianca escaladas
  minCerimoniario: number;
  maxCerimoniario: number;
  cerimoniarios: string[];
};
