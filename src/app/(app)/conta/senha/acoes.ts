'use server';

import { redirect } from 'next/navigation';
import { requireUser, pendenciaDeAcesso, usuarioDaSessao } from '@/lib/auth/guards';
import { trocarSenha } from '@/server/auth';

type Estado = { erro?: string; ok?: boolean } | undefined;

export async function trocarSenhaAcao(_: Estado, fd: FormData): Promise<Estado> {
  const u = await requireUser({ permitirPendente: true });
  const nova = String(fd.get('nova') ?? '');
  if (nova !== String(fd.get('confirmacao') ?? '')) return { erro: 'As senhas não conferem.' };
  const r = await trocarSenha(u, String(fd.get('atual') ?? ''), nova);
  if (!r.ok) return { erro: r.erro };
  const atual = await usuarioDaSessao();
  const prox = atual ? pendenciaDeAcesso(atual) : null;
  if (u.trocarSenha) redirect(prox ?? '/painel');
  return { ok: true };
}
