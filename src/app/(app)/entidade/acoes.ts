'use server';

import { z } from 'zod';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import type { RelatorioValidacao } from '@/lib/validacao/tipos';
import { descartarRascunho, enviarSubmissao, reenviarSubmissao, salvarRascunho } from '@/server/submissoes';

const texto = z.string().max(1000);
const schemaPayload = z.object({
  id: z.string().uuid().optional(),
  cabecalho: z.record(z.string(), texto),
  linhas: z.array(z.record(z.string(), texto)).max(5000),
});

export async function salvarRascunhoAcao(entrada: unknown): Promise<Resultado<{ id: string; relatorio: RelatorioValidacao }>> {
  return acao(async () => {
    const u = await requireUser();
    const p = schemaPayload.parse(entrada);
    return salvarRascunho(u, { id: p.id, cabecalho: p.cabecalho, linhas: p.linhas, tipoEntrada: 'formulario' });
  });
}

export async function enviarAcao(id: string, declaracao: boolean): Promise<Resultado<{ protocolo: string }>> {
  return acao(async () => {
    const u = await requireUser();
    const r = await enviarSubmissao(u, z.string().uuid().parse(id), { declaracao });
    return { protocolo: r.protocolo };
  });
}

export async function reenviarAcao(id: string, declaracao: boolean): Promise<Resultado<{ protocolo: string }>> {
  return acao(async () => {
    const u = await requireUser();
    return reenviarSubmissao(u, z.string().uuid().parse(id), { declaracao });
  });
}

export async function descartarAcao(id: string): Promise<Resultado> {
  return acao(async () => {
    await descartarRascunho(await requireUser(), z.string().uuid().parse(id));
  });
}
