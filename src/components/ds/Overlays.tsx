'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './util';

function usePresa(aberto: boolean, aoFechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const alvo = ref.current;
    const focaveis = () =>
      Array.from(
        alvo?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focaveis()[0]?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
      if (e.key === 'Tab') {
        const f = focaveis();
        if (f.length === 0) return;
        const primeiro = f[0]!;
        const ultimo = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = '';
      anterior?.focus();
    };
  }, [aberto, aoFechar]);
  return ref;
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
  rodape,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const ref = usePresa(aberto, aoFechar);
  if (!aberto) return null;
  return (
    <div className="omv-overlay" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div ref={ref} className="omv-modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="omv-modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="omv-iconbtn" onClick={aoFechar} aria-label="Fechar">
            <Icon name="fechar" size={20} />
          </button>
        </div>
        <div className="omv-modal-corpo">{children}</div>
        {rodape ? <div className="omv-modal-rodape">{rodape}</div> : null}
      </div>
    </div>
  );
}

export function Drawer({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = usePresa(aberto, aoFechar);
  if (!aberto) return null;
  return (
    <div className="omv-overlay omv-overlay-lado" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <aside ref={ref} className={cx('omv-drawer')} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="omv-modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="omv-iconbtn" onClick={aoFechar} aria-label="Fechar">
            <Icon name="fechar" size={20} />
          </button>
        </div>
        <div className="omv-modal-corpo">{children}</div>
      </aside>
    </div>
  );
}
