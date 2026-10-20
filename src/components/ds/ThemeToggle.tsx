'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function ThemeToggle({ className }: { className?: string }) {
  const [tema, setTema] = useState<'auto' | 'light' | 'dark'>('auto');
  useEffect(() => {
    try {
      const t = localStorage.getItem('omv-tema');
      if (t === 'light' || t === 'dark') setTema(t);
    } catch {}
  }, []);
  const alternar = () => {
    const efetivo =
      tema === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : tema;
    const novo = efetivo === 'dark' ? 'light' : 'dark';
    setTema(novo);
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem('omv-tema', novo);
    } catch {}
  };
  return (
    <button type="button" className={`omv-iconbtn ${className ?? ''}`} onClick={alternar} aria-label="Alternar tema claro/escuro">
      <Icon name="tema" size={22} />
    </button>
  );
}

/** Script inline que aplica o tema salvo antes da pintura (evita flash). */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem('omv-tema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
