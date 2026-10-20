import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './util';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const is = size === 'sm' ? 16 : 18;
  return (
    <button
      type={type}
      className={cx('omv-btn', `omv-btn-${variant}`, size === 'sm' && 'omv-btn-sm', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={is} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={is} /> : null}
    </button>
  );
}

/** Link com aparência de botão (navegação). */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  className,
}: {
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
  className?: string;
}) {
  const is = size === 'sm' ? 16 : 18;
  return (
    <a
      href={href}
      className={cx('omv-btn', `omv-btn-${variant}`, size === 'sm' && 'omv-btn-sm', className)}
    >
      {icon ? <Icon name={icon} size={is} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={is} /> : null}
    </a>
  );
}
