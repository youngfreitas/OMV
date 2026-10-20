'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import type { AcaoFluxo } from '@/lib/fluxo/maquina';
import { adicionarComentario, adicionarPendencia, executarAcao, resolverPendencia } from '@/server/analise';
import { lerOriginalRestrito, type Payload } from '@/server/submissoes';

const ACOES = ['iniciar_analise', 'devolver', 'aprovar', 'rejeitar', 'retirar'] as const;

export async function acaoFluxoAcao(
  id: string,
  a: string,
  dados: { justificativa?: string; pendencias?: Array<{ linha?: number; descricao: string }> },
): Promise<Resultado<{ status: string }>> {
  return acao(async () => {
    const u = await requireUser();
    const acaoValida = z.enum(ACOES).parse(a) as AcaoFluxo;
    const r = await executarAcao(u, z.string().uuid().parse(id), acaoValida, dados);
    revalidatePath(`/analise/${id}`);
    revalidatePath('/analise');
    return r;
  });
}

export async function comentarAcao(id: string, texto: string, visivel: boolean): Promise<Resultado> {
  return acao(async () => {
    await adicionarComentario(await requireUser(), z.string().uuid().parse(id), texto, visivel);
    revalidatePath(`/analise/${id}`);
  });
}

export async function pendenciaAcao(id: string, p: { linha?: number; descricao: string }): Promise<Resultado> {
  return acao(async () => {
    await adicionarPendencia(await requireUser(), z.string().uuid().parse(id), p);
    revalidatePath(`/analise/${id}`);
  });
}

export async function resolverPendenciaAcao(id: string, pid: string): Promise<Resultado> {
  return acao(async () => {
    await resolverPendencia(await requireUser(), z.string().uuid().parse(pid));
    revalidatePath(`/analise/${id}`);
  });
}

export async function verOriginalAcao(id: string): Promise<Resultado<{ payload: Payload }>> {
  return acao(async () => ({ payload: await lerOriginalRestrito(await requireUser(), z.string().uuid().parse(id)) }));
}
