'use client';

import { useState, useTransition } from 'react';
import { Button, StatusBadge, useToast } from '@/components/ds';
import { configAcao } from '../cadastros/acoes';

export function LinhaConfig({ chave, valor, provisorio, descricao }: { chave: string; valor: unknown; provisorio: boolean; descricao: string }) {
  const ehBool = typeof valor === 'boolean';
  const [v, setV] = useState<string>(String(valor));
  const [validado, setValidado] = useState(!provisorio);
  const [, iniciar] = useTransition();
  const toast = useToast();
  return (
    <div style={{ borderBottom: '1px solid var(--linha)', paddingBottom: 12 }}>
      <div className="omv-linha">
        <code>{chave}</code>
        {provisorio ? <StatusBadge status="em_analise">Provisório</StatusBadge> : <StatusBadge status="aprovado">Validado</StatusBadge>}
      </div>
      <p className="omv-legenda" style={{ margin: '4px 0 8px' }}>{descricao}</p>
      <div className="omv-linha">
        {ehBool ? (
          <label className="omv-check"><input type="checkbox" checked={v === 'true'} onChange={(e) => setV(String(e.target.checked))} aria-label={chave} /> Ativado</label>
        ) : (
          <input className="omv-input" style={{ width: 120 }} type="number" value={v} onChange={(e) => setV(e.target.value)} aria-label={chave} />
        )}
        <label className="omv-check"><input type="checkbox" checked={validado} onChange={(e) => setValidado(e.target.checked)} /> Validado institucionalmente</label>
        <Button size="sm" variant="secondary" onClick={() => iniciar(async () => {
          const r = await configAcao(chave, ehBool ? v === 'true' : Number(v), validado);
          toast(r.ok ? 'ok' : 'erro', r.ok ? 'Parâmetro salvo.' : r.erro);
        })}>Salvar</Button>
      </div>
    </div>
  );
}
