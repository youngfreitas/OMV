'use server';

import { z } from 'zod';
import { redefinirSenhaComToken, solicitarRedefinicao } from '@/server/auth';
import type { EstadoForm } from '../entrar/acoes';

export async function solicitarAcao(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const p = z.string().email().max(200).safeParse(fd.get('email'));
  if (p.success) await solicitarRedefinicao(p.data);
  // Resposta idêntica exista ou não a conta (evita enumeração de usuários).
  return { ok: true };
}

export async function redefinirAcao(token: string, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const nova = String(fd.get('senha') ?? '');
  if (nova !== String(fd.get('confirmacao') ?? '')) return { erro: 'As senhas não conferem.' };
  const r = await redefinirSenhaComToken(token, nova);
  return r.ok ? { ok: true } : { erro: r.erro };
}
