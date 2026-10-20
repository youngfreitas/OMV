import type { ReactNode } from 'react';
import { cx } from './util';

/* Status do fluxo. Sempre com palavra (nunca só cor). */
export const ROTULOS_STATUS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aguardando_analise: 'Aguardando análise',
  em_analise: 'Em análise',
  pendente_correcao: 'Pendente de correção',
  reenviado: 'Reenviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  retirado: 'Retirado da publicação',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
  restrito: 'Restrito',
};

const CLASSE: Record<string, string> = {
  rascunho: 'rascunho',
  arquivado: 'rascunho',
  enviado: 'enviado',
  reenviado: 'enviado',
  aguardando_analise: 'em-analise',
  em_analise: 'em-analise',
  pendente_correcao: 'em-analise',
  aprovado: 'aprovado',
  rejeitado: 'reprovado',
  retirado: 'reprovado',
  restrito: 'reprovado',
  publicado: 'publicado',
};

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx('omv-badge', `omv-badge-${CLASSE[status] ?? 'rascunho'}`, className)}>
      {children ?? ROTULOS_STATUS[status] ?? status}
    </span>
  );
}
