'use client';

import { useActionState } from 'react';
import { Banner, Button, TextField } from '@/components/ds';
import { entrarAcao } from './acoes';

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrarAcao, undefined);
  return (
    <form action={acao} className="form-pilha" noValidate>
      {estado?.erro ? <Banner tipo="erro">{estado.erro}</Banner> : null}
      <TextField name="email" type="email" label="E-mail" autoComplete="username" required />
      <TextField name="senha" type="password" label="Senha" autoComplete="current-password" required />
      <Button type="submit" disabled={pendente} iconRight="seta-direita">
        {pendente ? 'Entrando…' : 'Entrar'}
      </Button>
      <a href="/recuperar-senha">Esqueci minha senha</a>
    </form>
  );
}
