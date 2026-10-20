export type RegistroAgregavel = {
  periodo: string; // YYYY-MM
  bairroId: string | null;
  regiaoId: string | null;
  tipoRegistro: string;
  unidade: string;
  categoria: string;
  faixa: string;
  quantidade: number;
};

export type TerritorioCfg = {
  municipioId: string;
  bairros: Array<{ id: string; regiaoId: string | null }>;
  regioes: Array<{ id: string }>;
};

export type DominiosCubos = { categoria: string[]; faixa: string[]; tipo: string[] };

export type ConfigSupressao = {
  k: number;
  complementar: boolean;
};

export type Cubo = 'total' | 'territorio' | 'categoria' | 'faixa' | 'tipo';

export type Indicador = {
  cubo: Cubo;
  periodo: string; // YYYY-MM | YYYY | todos
  unidade: string;
  territorioTipo: 'municipio' | 'regiao' | 'bairro';
  territorioId: string;
  dimensao: string; // '' | categoria:x | faixa:x | tipo:x
  valor: number | null;
  suprimido: boolean;
  motivo: 'primaria' | 'complementar' | null;
};

export type RelatorioSupressao = {
  k: number;
  complementar: boolean;
  celulas: number;
  publicadas: number;
  suprimidasPrimarias: number;
  suprimidasComplementares: number;
  porUnidade: Record<string, { celulas: number; suprimidas: number }>;
};

export const SEM_REGIAO = 'sem-regiao';
