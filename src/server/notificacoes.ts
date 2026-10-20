import 'server-only';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { notificacoes, papeis, papelPermissoes, usuarioPapeis, usuarios } from '@/lib/db/schema';

export async function contarNaoLidas(usuarioId: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(notificacoes)
    .where(and(eq(notificacoes.usuarioId, usuarioId), isNull(notificacoes.lidaEm)));
  return r?.n ?? 0;
}

export async function listarNotificacoes(usuarioId: string, limite = 50) {
  return db
    .select()
    .from(notificacoes)
    .where(eq(notificacoes.usuarioId, usuarioId))
    .orderBy(desc(notificacoes.criadoEm))
    .limit(limite);
}

export async function marcarTodasLidas(usuarioId: string) {
  await db
    .update(notificacoes)
    .set({ lidaEm: new Date() })
    .where(and(eq(notificacoes.usuarioId, usuarioId), isNull(notificacoes.lidaEm)));
}

/** Notificações nunca carregam conteúdo de envio (apenas protocolo e status). */
export async function notificar(
  usuarioId: string,
  n: { tipo: string; titulo: string; texto?: string; link?: string },
) {
  await db.insert(notificacoes).values({ usuarioId, ...n });
}

/** Notifica todos os usuários ativos que tenham a permissão (ex.: analistas ao receber envio). */
export async function notificarPorPermissao(
  permissao: string,
  n: { tipo: string; titulo: string; texto?: string; link?: string },
) {
  const alvos = await db
    .selectDistinct({ id: usuarios.id })
    .from(usuarios)
    .innerJoin(usuarioPapeis, eq(usuarioPapeis.usuarioId, usuarios.id))
    .innerJoin(papeis, eq(papeis.id, usuarioPapeis.papelId))
    .innerJoin(papelPermissoes, eq(papelPermissoes.papelId, papeis.id))
    .where(and(eq(usuarios.ativo, true), eq(papelPermissoes.permissaoCodigo, permissao)));
  if (alvos.length) {
    await db.insert(notificacoes).values(alvos.map((a) => ({ usuarioId: a.id, ...n })));
  }
}
