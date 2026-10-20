'use client';

import { useActionState, useTransition } from 'react';
import { Banner, Button, SelectField, TextField, useToast } from '@/components/ds';
import { alternarEntidadeAcao, criarEntidadeAcao } from '../acoes';

export function FormEntidade({ tipos }: { tipos: Array<{ value: string; label: string }> }) {
  const [r, acao, pendente] = useActionState(criarEntidadeAcao, undefined);
  const resp = r as { ok: boolean; erro?: string } | undefined;
  return (
    <form action={acao} className="form-pilha">
      {resp && !resp.ok ? <Banner tipo="erro">{resp.erro}</Banner> : null}
      {resp?.ok ? <Banner tipo="info">Entidade cadastrada.</Banner> : null}
      <div className="omv-form-grid">
        <TextField name="nome" label="Nome da entidade" required />
        <SelectField name="tipo" label="Tipo" options={tipos} defaultValue="outra" />
      </div>
      <div>
        <Button type="submit" disabled={pendente} icon="mais">Cadastrar</Button>
      </div>
    </form>
  );
}

export function BotaoAlternar({ id, ativo }: { id: string; ativo: boolean }) {
  const [, t] = useTransition();
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        t(async () => {
          const r = await alternarEntidadeAcao(id, !ativo);
          if (!r.ok) toast('erro', r.erro);
        })
      }
    >
      {ativo ? 'Desativar' : 'Reativar'}
    </Button>
  );
}
