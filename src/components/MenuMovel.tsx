'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ds/Icon';

/** Em telas estreitas o menu lateral vira gaveta; em largas é fixo. */
export function MenuMovel({ menu, children }: { menu: ReactNode; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <div className="omv-shell-menu" data-aberto={aberto} onClick={() => setAberto(false)}>
        {menu}
      </div>
      <div className="omv-shell-main">
        <button
          type="button"
          className="omv-iconbtn omv-menu-botao"
          style={{ position: 'absolute', top: 20, left: 12, zIndex: 5 }}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={() => setAberto(true)}
        >
          <Icon name="menu" size={22} />
        </button>
        {children}
      </div>
    </>
  );
}
