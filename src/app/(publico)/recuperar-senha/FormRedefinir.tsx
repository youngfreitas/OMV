'use client';

import { useActionState } from 'react';
import { Banner, Button, TextField } from '@/components/ds';
import { redefinirAcao } from './acoes';

export function FormRedefinir({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(redefinirAcao.bind(null, token), undefined);
  if (estado?.ok) {
    return (
      <Banner tipo="info" titulo="Senha redefinida">
        Você já pode <a href="/entrar">entrar</a> com a nova senha.
      </Banner>
    );
  }
  return (
    <form action={acao} className="form-pilha">
      {estado?.erro ? <Banner tipo="erro">{estado.erro}</Banner> : null}
      <TextField name="senha" type="password" label="Nova senha" hint="Mínimo de 12 caracteres, combinando três tipos de caractere." autoComplete="new-password" required />
      <TextField name="confirmacao" type="password" label="Confirmar nova senha" autoComplete="new-password" required />
      <Button type="submit" disabled={pendente}>
        Redefinir senha
      </Button>
    </form>
  );
}
