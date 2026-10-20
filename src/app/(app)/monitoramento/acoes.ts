'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { registroHistorico, registroTags, registrosAprovados, submissoes, tags } from '@/lib/db/schema';
import { acao, type Resultado } from '@/lib/auth/acao';
import { exigir, requireUser } from '@/lib/auth/guards';
import { registrar } from '@/lib/auditoria';
import { fmtDataHora } from '@/lib/formato';
import { configuracao } from '@/server/cadastros';

export type DetalheRegistro = {
  id: string;
  submissaoId: string;
  protocolo: string;
  aprovadoEm: string;
  quantidade: number | null;
  tags: Array<{ id: string; nome: string; aplicada: boolean }>;
  historico: Array<{ quando: string; acao: string }>;
};

export async function detalheRegistroAcao(id: string): Promise<Resultado<{ detalhe: DetalheRegistro }>> {
  return acao(async () => {
    const u = await requireUser();
    exigir(u, 'monitoramento:ler');
    const rid = z.string().uuid().parse(id);
    const [r] = await db.select().from(registrosAprovados).where(eq(registrosAprovados.id, rid));
    if (!r) throw new Error('inexistente');
    const [s] = await db.select().from(submissoes).where(eq(submissoes.id, r.submissaoId));
    const k = await configuracao<number>('supressao.k', 5);
    const [todas, aplicadas, hist] = await Promise.all([
      db.select().from(tags).where(eq(tags.ativo, true)),
      db.select().from(registroTags).where(eq(registroTags.registroId, rid)),
      db.select().from(registroHistorico).where(eq(registroHistorico.registroId, rid)).orderBy(registroHistorico.criadoEm),
    ]);
    const irrestrito = u.permissoes.has('dados:ver_nao_suprimido');
    return {
      detalhe: {
        id: rid, submissaoId: r.submissaoId, protocolo: s?.protocolo ?? '—', aprovadoEm: fmtDataHora(r.aprovadoEm),
        quantidade: irrestrito || r.quantidade >= k || r.quantidade === 0 ? r.quantidade : null,
        tags: todas.map((t) => ({ id: t.id, nome: t.nome, aplicada: aplicadas.some((a) => a.tagId === t.id) })),
        historico: hist.map((h) => ({ quando: fmtDataHora(h.criadoEm), acao: h.acao })),
      },
    };
  });
}

export async function alternarTagAcao(registroId: string, tagId: string): Promise<Resultado> {
  return acao(async () => {
    const u = await requireUser();
    exigir(u, 'analise:comentar');
    const [rid, tid] = [z.string().uuid().parse(registroId), z.string().uuid().parse(tagId)];
    const [ja] = await db.select().from(registroTags).where(and(eq(registroTags.registroId, rid), eq(registroTags.tagId, tid)));
    if (ja) await db.delete(registroTags).where(and(eq(registroTags.registroId, rid), eq(registroTags.tagId, tid)));
    else await db.insert(registroTags).values({ registroId: rid, tagId: tid });
    await db.insert(registroHistorico).values({ registroId: rid, acao: ja ? 'etiqueta_removida' : 'etiqueta_aplicada', usuarioId: u.id });
    await registrar({ usuarioId: u.id, acao: 'registro.etiqueta', recursoTipo: 'registro', recursoId: rid });
  });
}
