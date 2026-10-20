import type { Permissao } from '../auth/permissoes';

export type Status =
  | 'rascunho'
  | 'enviado'
  | 'aguardando_analise'
  | 'em_analise'
  | 'pendente_correcao'
  | 'reenviado'
  | 'aprovado'
  | 'rejeitado'
  | 'retirado';

export type AcaoFluxo = 'enviar' | 'iniciar_analise' | 'devolver' | 'reenviar' | 'aprovar' | 'rejeitar' | 'retirar';

export const STATUS_FINAIS: Status[] = ['rejeitado', 'retirado'];

const TRANSICOES: Record<Status, Partial<Record<AcaoFluxo, Status>>> = {
  rascunho: { enviar: 'enviado' },
  enviado: { iniciar_analise: 'em_analise' },
  aguardando_analise: { iniciar_analise: 'em_analise' },
  reenviado: { iniciar_analise: 'em_analise' },
  em_analise: { devolver: 'pendente_correcao', aprovar: 'aprovado', rejeitar: 'rejeitado' },
  pendente_correcao: { reenviar: 'reenviado' },
  aprovado: { retirar: 'retirado' },
  rejeitado: {},
  retirado: {},
};

export const PERMISSAO_DA_ACAO: Record<AcaoFluxo, Permissao> = {
  enviar: 'submissao:criar',
  reenviar: 'submissao:criar',
  iniciar_analise: 'analise:comentar',
  devolver: 'analise:devolver',
  aprovar: 'analise:aprovar',
  rejeitar: 'analise:rejeitar',
  retirar: 'analise:retirar',
};

export const EXIGE_JUSTIFICATIVA: AcaoFluxo[] = ['devolver', 'rejeitar', 'retirar'];

export function proximoStatus(atual: Status, acao: AcaoFluxo): Status | null {
  return TRANSICOES[atual]?.[acao] ?? null;
}

export function acoesPossiveis(atual: Status): AcaoFluxo[] {
  return Object.keys(TRANSICOES[atual] ?? {}) as AcaoFluxo[];
}

/** A entidade só edita o conteúdo em rascunho ou quando devolvido para correção. */
export function editavel(s: Status): boolean {
  return s === 'rascunho' || s === 'pendente_correcao';
}
