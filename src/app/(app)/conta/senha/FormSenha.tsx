'use client';

import { useActionState } from 'react';
import { Banner, Button, TextField } from '@/components/ds';
import { trocarSenhaAcao } from './acoes';

export function FormSenha() {
  const [estado, acao, pendente] = useActionState(trocarSenhaAcao, undefined);
  return (
    <form action={acao} className="form-pilha">
      {estado?.erro ? <Banner tipo="erro">{estado.erro}</Banner> : null}
      {estado?.ok ? <Banner tipo="info">Senha alterada com sucesso.</Banner> : null}
      <TextField name="atual" type="password" label="Senha atual" autoComplete="current-password" required />
      <TextField name="nova" type="password" label="Nova senha" hint="Mínimo de 12 caracteres, combinando três tipos de caractere." autoComplete="new-password" required />
      <TextField name="confirmacao" type="password" label="Confirmar nova senha" autoComplete="new-password" required />
      <Button type="submit" disabled={pendente}>Salvar nova senha</Button>
    </form>
  );
}
