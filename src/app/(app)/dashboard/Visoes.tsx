'use client';

import { useState, useTransition } from 'react';
import { Button, TextField, useToast } from '@/components/ds';
import { excluirVisaoAcao, salvarVisaoAcao } from './acoes';

export function Visoes({ salvas, atual }: { salvas: Array<{ id: string; nome: string; filtros: Record<string, string> }>; atual: Record<string, string> }) {
  const [nome, setNome] = useState('');
  const [, iniciar] = useTransition();
  const toast = useToast();
  return (
    <div className="omv-painel">
      <h2>Visualizações salvas</h2>
      <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
        {salvas.length === 0 ? <li className="omv-muted">Nenhuma visualização salva.</li> : null}
        {salvas.map((v) => (
          <li key={v.id}>
            <a href={`/dashboard?${new URLSearchParams(v.filtros)}`}>{v.nome}</a>{' '}
            <button type="button" className="omv-btn omv-btn-ghost omv-btn-sm" onClick={() => iniciar(async () => { await excluirVisaoAcao(v.id); window.location.reload(); })}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <div className="omv-filtros">
        <TextField label="Salvar filtros atuais como" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button
          variant="secondary"
          icon="arquivar"
          disabled={nome.trim().length < 2}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarVisaoAcao(nome, atual);
              if (r.ok) window.location.reload();
              else toast('erro', r.erro);
            })
          }
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
