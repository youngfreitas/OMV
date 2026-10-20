import type { ReactNode } from 'react';
import { cx } from './util';

export function Table({
  legenda,
  children,
  className,
}: {
  legenda: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('omv-table-wrap', className)} tabIndex={0} role="region" aria-label={legenda}>
      <table className="omv-table">
        <caption className="omv-sr">{legenda}</caption>
        {children}
      </table>
    </div>
  );
}
