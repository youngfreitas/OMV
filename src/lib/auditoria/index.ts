import 'server-only';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { auditoria } from '@/lib/db/schema';

export type CtxReq = { ip: string; userAgent: string };

export async function ctxRequisicao(): Promise<CtxReq> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconhecido';
    return { ip, userAgent: (h.get('user-agent') ?? '').slice(0, 300) };
  } catch {
    return { ip: 'interno', userAgent: '' };
  }
}

type Cliente = Pick<typeof db, 'insert'>;

export type EventoAuditoria = {
  usuarioId?: string | null;
  entidadeId?: string | null;
  acao: string;
  recursoTipo?: string;
  recursoId?: string;
  detalhes?: Record<string, unknown>;
  ip?: string;
};

/** Remove textos longos: a auditoria nunca deve carregar conteúdo de envios (possível dado pessoal). */
function limpar(d?: Record<string, unknown>) {
  if (!d) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) out[k] = typeof v === 'string' && v.length > 300 ? `${v.slice(0, 300)}…` : v;
  return out;
}

export async function registrar(ev: EventoAuditoria, cliente: Cliente = db): Promise<void> {
  const ip = ev.ip ?? (await ctxRequisicao()).ip;
  await cliente.insert(auditoria).values({
    usuarioId: ev.usuarioId ?? null,
    entidadeId: ev.entidadeId ?? null,
    acao: ev.acao,
    recursoTipo: ev.recursoTipo,
    recursoId: ev.recursoId,
    ip,
    detalhes: limpar(ev.detalhes),
  });
}
