'use server';

import { redirect } from 'next/navigation';
import { usuarioDaSessao } from '@/lib/auth/guards';
import { sair } from '@/server/auth';

export async function sairAcao() {
  const u = await usuarioDaSessao();
  await sair(u ?? undefined);
  redirect('/');
}
