import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './util';

export function Banner({
  tipo = 'info',
  titulo,
  children,
  className,
}: {
  tipo?: 'info' | 'alerta' | 'erro' | 'demo';
  titulo?: string;
  children?: ReactNode;
  className?: string;
}) {
  const icone = tipo === 'erro' || tipo === 'alerta' ? 'alerta' : 'info';
  return (
    <div
      className={cx('omv-banner', `omv-banner-${tipo}`, className)}
      role={tipo === 'erro' ? 'alert' : 'status'}
    >
      <Icon name={icone} size={20} />
      <div>
        {titulo ? <strong>{titulo}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  titulo,
  children,
  icon = 'indicadores',
  acao,
}: {
  titulo: string;
  children?: ReactNode;
  icon?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="omv-empty">
      <div className="omv-tile">
        <Icon name={icon} size={24} />
      </div>
      <h3>{titulo}</h3>
      {children ? <p>{children}</p> : null}
      {acao ? <div className="omv-empty-acao">{acao}</div> : null}
    </div>
  );
}

export function Stepper({
  etapas,
  atual,
}: {
  etapas: string[];
  atual: number;
}) {
  return (
    <ol className="omv-stepper" aria-label="Progresso do preenchimento">
      {etapas.map((e, i) => (
        <li
          key={e}
          className={cx(i < atual && 'feito', i === atual && 'atual')}
          aria-current={i === atual ? 'step' : undefined}
        >
          <span className="omv-step-num">{i < atual ? <Icon name="confirmar" size={16} strokeWidth={3} /> : i + 1}</span>
          <span className="omv-step-rot">{e}</span>
        </li>
      ))}
    </ol>
  );
}

export function Pagina({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="omv-pagina">
      <div className="omv-pagina-topo">
        <div>
          <h1>{titulo}</h1>
          {descricao ? <p className="omv-pagina-desc">{descricao}</p> : null}
        </div>
        {acoes ? <div className="omv-pagina-acoes">{acoes}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Cartao({
  titulo,
  children,
  className,
  acoes,
}: {
  titulo?: ReactNode;
  children: ReactNode;
  className?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className={cx('omv-painel', className)}>
      {titulo || acoes ? (
        <div className="omv-painel-topo">
          {titulo ? <h2>{titulo}</h2> : <span />}
          {acoes}
        </div>
      ) : null}
      {children}
    </div>
  );
}
