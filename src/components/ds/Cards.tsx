import type { MouseEventHandler, ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './util';

export function StatCard({
  label,
  value,
  note,
  icon,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  className?: string;
}) {
  return (
    <div className={cx('omv-card', className)}>
      {icon ? (
        <div className="omv-tile">
          <Icon name={icon} size={24} />
        </div>
      ) : null}
      <div className="omv-stat-body">
        <p className="omv-stat-label">{label}</p>
        <div className="omv-stat-row">
          <span className="omv-stat-value">{value}</span>
          {trend ? (
            <span className="omv-trend">
              <Icon
                name={trend.direction === 'down' ? 'desceu' : 'subiu'}
                size={14}
                strokeWidth={2.5}
                label={trend.direction === 'down' ? 'redução de' : 'aumento de'}
              />
              {trend.value}
            </span>
          ) : null}
        </div>
        {note ? <p className="omv-stat-note">{note}</p> : null}
      </div>
    </div>
  );
}

export function LinkCard({
  label,
  description,
  icon,
  href,
  onClick,
  className,
}: {
  label: string;
  description?: string;
  icon?: string;
  href?: string;
  onClick?: MouseEventHandler;
  className?: string;
}) {
  const conteudo = (
    <>
      {icon ? (
        <span className="omv-tile">
          <Icon name={icon} size={24} />
        </span>
      ) : null}
      <span className="omv-linkcard-text">
        <span className="omv-linkcard-label" style={{ display: 'block' }}>
          {label}
        </span>
        {description ? (
          <span className="omv-linkcard-desc" style={{ display: 'block' }}>
            {description}
          </span>
        ) : null}
      </span>
      <Icon name="seta-direita" size={20} />
    </>
  );
  const cls = cx('omv-card', 'omv-linkcard', className);
  return href ? (
    <a href={href} className={cls} onClick={onClick}>
      {conteudo}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick} style={{ font: 'inherit', textAlign: 'left', width: '100%' }}>
      {conteudo}
    </button>
  );
}
