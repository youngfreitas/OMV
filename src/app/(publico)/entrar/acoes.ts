'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { autenticar, verificarMfaLogin } from '@/server/auth';
import { usuarioDaSessao, pendenciaDeAcesso } from '@/lib/auth/guards';

export type EstadoForm = { erro?: string; ok?: boolean } | undefined;

const schemaLogin = z.object({ email: z.string().email().max(200), senha: z.string().min(1).max(200) });

export async function entrarAcao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const p = schemaLogin.safeParse({ email: fd.get('email'), senha: fd.get('senha') });
  if (!p.success) return { erro: 'Informe um e-mail válido e a senha.' };
  const r = await autenticar(p.data.email, p.data.senha);
  if (!r.ok) return { erro: r.erro };
  redirect(r.destino);
}

export async function mfaAcao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const u = await usuarioDaSessao();
  if (!u) redirect('/entrar');
  const codigo = String(fd.get('codigo') ?? '');
  const r = await verificarMfaLogin(u, codigo);
  if (!r.ok) return { erro: r.erro };
  const atualizado = await usuarioDaSessao();
  redirect((atualizado && pendenciaDeAcesso({ ...atualizado, mfaVerificado: true })) || '/painel');
}
