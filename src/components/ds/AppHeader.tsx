import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { ThemeToggle } from './ThemeToggle';
import { cx } from './util';

export function AppHeader({
  title,
  logoHref = '/',
  notifications = 0,
  userInitials,
  userName,
  tools,
  menuButton,
  className,
}: {
  title?: string;
  logoHref?: string;
  notifications?: number;
  userInitials?: string;
  userName?: string;
  tools?: ReactNode;
  menuButton?: ReactNode;
  className?: string;
}) {
  const alt = 'OMV — Observatório Municipal de Violência';
  return (
    <header className={cx('omv-header', className)}>
      {menuButton}
      <a className="omv-header-logo" href={logoHref}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="omv-only-light" src="/marca/omv-horizontal-cor.svg" alt={alt} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="omv-only-dark" src="/marca/omv-horizontal-negativo.svg" alt={alt} />
      </a>
      {title ? <h1 className="omv-header-title">{title}</h1> : null}
      <div className="omv-header-tools">
        {tools}
        <ThemeToggle />
        <a
          href="/notificacoes"
          className="omv-iconbtn"
          aria-label={notifications ? `Notificações (${notifications} novas)` : 'Notificações'}
        >
          <Icon name="notificacoes" size={22} />
          {notifications ? <span className="omv-iconbtn-dot" /> : null}
        </a>
        <a href="/conta" className="omv-avatar" title={userName ?? 'Minha conta'} aria-label="Minha conta">
          {userInitials ?? <Icon name="usuario" size={20} />}
        </a>
      </div>
    </header>
  );
}
