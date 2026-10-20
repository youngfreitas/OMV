import type { LinhaNormalizada } from './tipos';

const DIMENSOES = [
  'periodo_inicio',
  'periodo_fim',
  'bairro',
  'tipo_registro',
  'unidade_contagem',
  'categoria_violencia',
  'faixa_etaria',
  'tipo_atendimento',
  'canal_entrada',
  'relacao_autor',
  'situacao_atendimento',
] as const;

/** Combinação de dimensões (sem a quantidade): duas linhas com a mesma chave são suspeitas de duplicidade. */
export function chaveDimensao(l: LinhaNormalizada): string {
  return DIMENSOES.map((d) => l[d] ?? '').join('|');
}

/** Conteúdo canônico da linha (inclui quantidade) usado para o hash por entidade + período + linha. */
export function conteudoCanonico(entidadeId: string, l: LinhaNormalizada): string {
  return `${entidadeId}|${chaveDimensao(l)}|${l.quantidade}`;
}
