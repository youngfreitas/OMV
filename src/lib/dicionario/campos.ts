/**
 * DICIONÁRIO DE DADOS — fonte única.
 * Formulário, modelos (CSV/XLSX/DOCX/MD), validação, documentação e exportações derivam daqui.
 */
import type { NomeDominio } from './dominios';

export const VERSAO_MODELO = '1.0.0';
export const ID_MODELO = 'OMV-MULHERES';

export type TipoCampo = 'texto' | 'texto_longo' | 'inteiro' | 'data' | 'dominio' | 'booleano';

export type CampoDef = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  dominio?: NomeDominio | 'bairro';
  obrigatorio: boolean;
  ajuda: string;
  exemplo: string;
  max?: number;
  /** Texto livre: sujeito à detecção de possível dado pessoal. */
  textoLivre?: boolean;
  /** Campo só se aplica quando outra condição é satisfeita (documentação e UI). */
  condicional?: { campo: string; valoresQueExigem?: string[]; descricao: string };
};

/** Campos do cabeçalho do envio (um por envio). */
export const CAMPOS_ENVIO: CampoDef[] = [
  {
    chave: 'periodo_inicio',
    rotulo: 'Início do período de referência',
    tipo: 'data',
    obrigatorio: true,
    ajuda: 'Primeiro dia do período a que os números se referem (dd/mm/aaaa ou aaaa-mm-dd).',
    exemplo: '01/03/2026',
  },
  {
    chave: 'periodo_fim',
    rotulo: 'Fim do período de referência',
    tipo: 'data',
    obrigatorio: true,
    ajuda: 'Último dia do período. Não pode ser anterior ao início nem estar no futuro.',
    exemplo: '31/03/2026',
  },
  {
    chave: 'observacao_geral',
    rotulo: 'Observação geral do envio',
    tipo: 'texto_longo',
    obrigatorio: false,
    max: 500,
    textoLivre: true,
    ajuda: 'Contexto metodológico do envio. NÃO escreva nomes, documentos, telefones, e-mails ou endereços.',
    exemplo: 'Dados consolidados do mês, incluindo plantão.',
  },
];

/** Campos de cada linha (registro agregado). */
export const CAMPOS_LINHA: CampoDef[] = [
  {
    chave: 'bairro',
    rotulo: 'Bairro',
    tipo: 'dominio',
    dominio: 'bairro',
    obrigatorio: true,
    ajuda: 'Bairro do cadastro oficial (código ou nome). Use apenas bairros da lista.',
    exemplo: 'Centro',
  },
  {
    chave: 'tipo_registro',
    rotulo: 'Tipo de registro',
    tipo: 'dominio',
    dominio: 'tipo_registro',
    obrigatorio: true,
    ajuda: 'Natureza do registro que originou a contagem.',
    exemplo: 'atendimento_servico',
  },
  {
    chave: 'unidade_contagem',
    rotulo: 'Unidade de contagem',
    tipo: 'dominio',
    dominio: 'unidade_contagem',
    obrigatorio: true,
    ajuda: 'O que a quantidade conta: registros, atendimentos ou pessoas únicas. Medidas distintas nunca são somadas.',
    exemplo: 'atendimento',
  },
  {
    chave: 'categoria_violencia',
    rotulo: 'Categoria de violência',
    tipo: 'dominio',
    dominio: 'categoria_violencia',
    obrigatorio: true,
    ajuda: 'Categoria principal. Use “Não especificada” quando não houver classificação.',
    exemplo: 'psicologica',
  },
  {
    chave: 'faixa_etaria',
    rotulo: 'Faixa etária',
    tipo: 'dominio',
    dominio: 'faixa_etaria',
    obrigatorio: true,
    ajuda: 'Faixa etária da pessoa atendida (nunca a idade exata ou data de nascimento).',
    exemplo: '25_34',
  },
  {
    chave: 'tipo_atendimento',
    rotulo: 'Tipo de atendimento',
    tipo: 'dominio',
    dominio: 'tipo_atendimento',
    obrigatorio: false,
    ajuda: 'Principal atendimento prestado.',
    exemplo: 'acolhimento',
    condicional: {
      campo: 'tipo_registro',
      valoresQueExigem: ['atendimento_servico'],
      descricao: 'Obrigatório quando o tipo de registro é “Atendimento em serviço da rede”.',
    },
  },
  {
    chave: 'canal_entrada',
    rotulo: 'Canal de entrada',
    tipo: 'dominio',
    dominio: 'canal_entrada',
    obrigatorio: false,
    ajuda: 'Como a demanda chegou ao serviço.',
    exemplo: 'demanda_espontanea',
  },
  {
    chave: 'relacao_autor',
    rotulo: 'Vínculo com o autor',
    tipo: 'dominio',
    dominio: 'relacao_autor',
    obrigatorio: false,
    ajuda: 'Apenas o tipo de vínculo — nunca a identificação do autor.',
    exemplo: 'ex_companheiro',
  },
  {
    chave: 'situacao_atendimento',
    rotulo: 'Situação do atendimento',
    tipo: 'dominio',
    dominio: 'situacao_atendimento',
    obrigatorio: false,
    ajuda: 'Situação ao final do período.',
    exemplo: 'em_acompanhamento',
  },
  {
    chave: 'quantidade',
    rotulo: 'Quantidade',
    tipo: 'inteiro',
    obrigatorio: true,
    ajuda: 'Número inteiro maior ou igual a zero, conforme a unidade de contagem.',
    exemplo: '12',
  },
  {
    chave: 'observacao',
    rotulo: 'Observação da linha',
    tipo: 'texto',
    obrigatorio: false,
    max: 200,
    textoLivre: true,
    ajuda: 'Opcional. Não registre dados pessoais; linhas com possível dado pessoal são bloqueadas para análise restrita.',
    exemplo: '',
  },
];

export const CHAVES_LINHA = CAMPOS_LINHA.map((c) => c.chave);
export const CHAVES_ENVIO = CAMPOS_ENVIO.map((c) => c.chave);

export const DECLARACAO_SEM_DADOS_PESSOAIS =
  'Declaro que este envio contém somente dados agregados e não inclui nome, documento, telefone, e-mail, endereço, coordenadas ou qualquer informação que identifique a pessoa atendida.';

export function campoPorChave(chave: string): CampoDef | undefined {
  return [...CAMPOS_ENVIO, ...CAMPOS_LINHA].find((c) => c.chave === chave);
}

/** Linha bruta (texto) como chega do formulário ou de uma importação. */
export type LinhaBruta = Record<string, string | undefined>;
