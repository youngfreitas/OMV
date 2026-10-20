'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type Aviso = { id: number; tipo: 'ok' | 'erro'; texto: string };
const Ctx = createContext<(tipo: Aviso['tipo'], texto: string) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const mostrar = useCallback((tipo: Aviso['tipo'], texto: string) => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, tipo, texto }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="omv-toasts" aria-live="polite" aria-atomic="false">
        {avisos.map((a) => (
          <div key={a.id} className={`omv-toast omv-toast-${a.tipo}`} role={a.tipo === 'erro' ? 'alert' : 'status'}>
            <Icon name={a.tipo === 'erro' ? 'alerta' : 'confirmar'} size={18} />
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
