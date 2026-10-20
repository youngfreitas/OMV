'use client';

import { useActionState } from 'react';
import { Banner, Button, TextField } from '@/components/ds';
import { solicitarAcao } from './acoes';

export function FormSolicitar() {
  const [estado, acao, pendente] = useActionState(solicitarAcao, undefined);
  if (estado?.ok) {
    return (
      <Banner tipo="info" titulo="Pedido registrado">
        Se o e-mail estiver cadastrado, você receberá um link válido por 30 minutos.
      </Banner>
    );
  }
  return (
    <form action={acao} className="form-pilha">
      <TextField name="email" type="email" label="E-mail cadastrado" autoComplete="username" required />
      <Button type="submit" disabled={pendente}>
        Enviar link de redefinição
      </Button>
      <a href="/entrar">Voltar ao acesso</a>
    </form>
  );
}
