'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import { gerarPublicacao, publicar, retirarPublicacao } from '@/server/publicacao';

export async function gerarAcao(): Promise<Resultado<{ versao: number }>> {
  return acao(async () => {
    const p = await gerarPublicacao(await requireUser());
    revalidatePath('/admin/publicacao');
    return { versao: p.versao };
  });
}

export async function publicarAcao(id: string): Promise<Resultado> {
  return acao(async () => {
    await publicar(await requireUser(), z.string().uuid().parse(id));
    revalidatePath('/admin/publicacao');
    revalidatePath('/');
    revalidatePath('/mapa');
  });
}

export async function retirarAcao(id: string, motivo: string): Promise<Resultado> {
  return acao(async () => {
    await retirarPublicacao(await requireUser(), z.string().uuid().parse(id), motivo);
    revalidatePath('/admin/publicacao');
    revalidatePath('/');
    revalidatePath('/mapa');
  });
}
