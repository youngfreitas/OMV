'use client';

import { useActionState } from 'react';
import { Banner, Button, TextField } from '@/components/ds';
import { mfaAcao } from '../acoes';

export function FormMfa() {
  const [estado, acao, pendente] = useActionState(mfaAcao, undefined);
  return (
    <form action={acao} className="form-pilha">
      {estado?.erro ? <Banner tipo="erro">{estado.erro}</Banner> : null}
      <TextField
        name="codigo"
        label="Código de 6 dígitos"
        hint="Ou use um código de recuperação."
        inputMode="numeric"
        autoComplete="one-time-code"
        required
      />
      <Button type="submit" disabled={pendente}>
        {pendente ? 'Verificando…' : 'Verificar'}
      </Button>
    </form>
  );
}
