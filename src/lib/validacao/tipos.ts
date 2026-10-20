import type { Dominios } from '../dicionario/dominios';
import type { TipoPii } from './pii';

export type Nivel = 'erro' | 'alerta' | 'info';

export type Achado = {
  nivel: Nivel;
  codigo: string;
  mensagem: string;
  linha?: number;
  campo?: string;
};

export type LinhaNormalizada = {
  linha: number;
  periodo_inicio: string;
  periodo_fim: string;
  bairro: string; // código do bairro
  tipo_registro: string;
  unidade_contagem: string;
  categoria_violencia: string;
  faixa_etaria: string;
  tipo_atendimento?: string;
  canal_entrada?: string;
  relacao_autor?: string;
  situacao_atendimento?: string;
  quantidade: number;
  observacao?: string;
  /** Linha possui erro bloqueante. */
  invalida: boolean;
};

export type CelulaPii = { linha: number | null; campo: string; tipos: TipoPii[] };

export type ResumoValidacao = {
  totalLinhas: number;
  linhasInvalidas: number;
  erros: number;
  alertas: number;
  quantidadePorUnidade: Record<string, number>;
  periodoInicio: string | null;
  periodoFim: string | null;
  qualidade: { completudeOpcionais: number; naoInformada: number };
};

export type RelatorioValidacao = {
  achados: Achado[];
  restrita: boolean;
  celulasPii: CelulaPii[];
  resumo: ResumoValidacao;
};

export type ContextoValidacao = {
  dominios: Dominios;
  bairros: Array<{ codigo: string; nome: string; ativo: boolean }>;
  hoje: Date;
  /** Limite (%) de variação vs. média histórica da entidade que gera alerta. */
  variacaoPct?: number;
  /** Média histórica de quantidade total por unidade de contagem (envios anteriores da entidade). */
  mediasHistoricas?: Record<string, number>;
  /** Hashes de linhas já recebidas da entidade em outros envios (duplicidade entre submissões). */
  hashesExistentes?: Set<string>;
  entidadeId: string;
  /** Função de hash por linha (injetada no servidor; o navegador não checa duplicidade entre envios). */
  hashearLinha?: (l: LinhaNormalizada) => string;
};
