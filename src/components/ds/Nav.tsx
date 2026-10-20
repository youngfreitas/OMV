import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './util';

export type ItemNav = {
  label: string;
  href: string;
  icon?: string;
  active?: boolean;
  count?: number;
};

export function NavItem({ label, href, icon, active, count, className }: ItemNav & { className?: string }) {
  return (
    <a className={cx('omv-nav-item', className)} href={href} aria-current={active ? 'page' : undefined}>
      {icon ? <Icon name={icon} size={22} /> : null}
      <span>{label}</span>
      {count ? (
        <span className="omv-nav-count" aria-label={`${count} pendentes`}>
          {count}
        </span>
      ) : null}
    </a>
  );
}

export function Sidebar({
  sections,
  logoSrc = '/marca/omv-horizontal-negativo.svg',
  logoHref = '/',
  footer,
  className,
  id,
}: {
  sections: Array<{ title?: string; items: ItemNav[] }>;
  logoSrc?: string;
  logoHref?: string;
  footer?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <nav id={id} className={cx('omv-sidebar', className)} aria-label="Menu principal">
      <a className="omv-sidebar-logo" href={logoHref}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="OMV — Observatório Municipal de Violência" />
      </a>
      {sections.map((sec, i) => (
        <div key={i}>
          {sec.title ? <p className="omv-sidebar-section">{sec.title}</p> : null}
          <ul className="omv-nav">
            {sec.items.map((it) => (
              <li key={it.href}>
                <NavItem {...it} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {footer ? <div className="omv-sidebar-foot">{footer}</div> : null}
    </nav>
  );
}
