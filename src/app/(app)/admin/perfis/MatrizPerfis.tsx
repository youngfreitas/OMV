'use client';

import { useState, useTransition } from 'react';
import { Button, Table, useToast } from '@/components/ds';
import { salvarPerfilAcao } from '../acoes';

type Papel = { id: string; nome: string; codigo: string; permissoes: string[] };

export function MatrizPerfis({ papeis, permissoes }: { papeis: Papel[]; permissoes: Array<{ codigo: string; descricao: string }> }) {
  const [estado, setEstado] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(papeis.map((p) => [p.id, new Set(p.permissoes)])),
  );
  const [, t] = useTransition();
  const toast = useToast();
  const alternar = (papel: string, perm: string) =>
    setEstado((e) => {
      const s = new Set(e[papel]);
      if (s.has(perm)) s.delete(perm);
      else s.add(perm);
      return { ...e, [papel]: s };
    });
  return (
    <>
      <Table legenda="Matriz de permissões por perfil">
        <thead>
          <tr>
            <th>Permissão</th>
            {papeis.map((p) => (
              <th key={p.id}>{p.nome}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissoes.map((perm) => (
            <tr key={perm.codigo}>
              <td>
                <code>{perm.codigo}</code>
                <br />
                <span className="omv-legenda">{perm.descricao}</span>
              </td>
              {papeis.map((p) => (
                <td key={p.id} style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label={`${perm.codigo} para ${p.nome}`}
                    checked={estado[p.id]?.has(perm.codigo) ?? false}
                    onChange={() => alternar(p.id, perm.codigo)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primaria)' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="omv-linha">
        {papeis.map((p) => (
          <Button
            key={p.id}
            variant="secondary"
            onClick={() =>
              t(async () => {
                const r = await salvarPerfilAcao(p.id, [...(estado[p.id] ?? [])]);
                toast(r.ok ? 'ok' : 'erro', r.ok ? `Perfil ${p.nome} salvo.` : r.erro);
              })
            }
          >
            Salvar {p.nome}
          </Button>
        ))}
      </div>
    </>
  );
}
