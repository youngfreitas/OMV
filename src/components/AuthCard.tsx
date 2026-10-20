import type { ReactNode } from 'react';

export function AuthCard({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="omv-painel auth-card">
        <h1 className="auth-titulo">{titulo}</h1>
        {descricao ? <p className="omv-muted" style={{ margin: '0 0 var(--espaco-5)' }}>{descricao}</p> : null}
        {children}
      </div>
    </div>
  );
}
