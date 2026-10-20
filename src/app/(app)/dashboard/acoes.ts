'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import { excluirVisualizacao, salvarVisualizacao } from '@/server/visualizacoes';

export async function salvarVisaoAcao(nome: string, filtros: Record<string, string>): Promise<Resultado> {
  return acao(async () => {
    await salvarVisualizacao(await requireUser(), nome, filtros);
    revalidatePath('/dashboard');
  });
}

export async function excluirVisaoAcao(id: string): Promise<Resultado> {
  return acao(async () => {
    await excluirVisualizacao(await requireUser(), z.string().uuid().parse(id));
    revalidatePath('/dashboard');
  });
}
