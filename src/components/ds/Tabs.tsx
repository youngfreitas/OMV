'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export function Tabs({
  abas,
  inicial = 0,
  rotulo,
}: {
  abas: Array<{ titulo: string; conteudo: ReactNode }>;
  inicial?: number;
  rotulo: string;
}) {
  const [i, setI] = useState(inicial);
  const base = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const teclado = (e: KeyboardEvent) => {
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % abas.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + abas.length) % abas.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = abas.length - 1;
    else return;
    e.preventDefault();
    setI(n);
    refs.current[n]?.focus();
  };
  return (
    <div className="omv-tabs">
      <div role="tablist" aria-label={rotulo} className="omv-tablist" onKeyDown={teclado}>
        {abas.map((a, n) => (
          <button
            key={a.titulo}
            ref={(el) => {
              refs.current[n] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-t${n}`}
            aria-selected={n === i}
            aria-controls={`${base}-p${n}`}
            tabIndex={n === i ? 0 : -1}
            className="omv-tab"
            onClick={() => setI(n)}
          >
            {a.titulo}
          </button>
        ))}
      </div>
      {abas.map((a, n) => (
        <div
          key={a.titulo}
          role="tabpanel"
          id={`${base}-p${n}`}
          aria-labelledby={`${base}-t${n}`}
          hidden={n !== i}
          className="omv-tabpanel"
        >
          {n === i ? a.conteudo : null}
        </div>
      ))}
    </div>
  );
}
