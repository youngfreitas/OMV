import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { sessoes } from '@/lib/db/schema';
import { COOKIE_SESSAO, SESSAO_ABSOLUTA_MS, SESSAO_OCIOSA_MS } from './config';
import { sha256Hex, tokenAleatorio } from './cripto';

export function cookieSeguro(): boolean {
  return process.env.NODE_ENV === 'production' || (process.env.OMV_URL_PUBLICA ?? '').startsWith('https://');
}

export async function criarSessao(
  usuarioId: string,
  opcoes: { ip?: string; userAgent?: string; mfaVerificado: boolean },
): Promise<string> {
  const token = tokenAleatorio(32);
  const agora = Date.now();
  await db.insert(sessoes).values({
    usuarioId,
    tokenHash: sha256Hex(token),
    absolutaEm: new Date(agora + SESSAO_ABSOLUTA_MS),
    mfaVerificado: opcoes.mfaVerificado,
    ip: opcoes.ip,
    userAgent: opcoes.userAgent,
  });
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: cookieSeguro(),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSAO_ABSOLUTA_MS / 1000),
  });
  return token;
}

export type SessaoValida = { id: string; usuarioId: string; mfaVerificado: boolean };

/** Valida token: não revogada, dentro do limite absoluto e ocioso. Renova o último uso. */
export async function validarToken(token: string | undefined, agora = new Date()): Promise<SessaoValida | null> {
  if (!token) return null;
  const [s] = await db
    .select()
    .from(sessoes)
    .where(and(eq(sessoes.tokenHash, sha256Hex(token)), isNull(sessoes.revogadaEm)))
    .limit(1);
  if (!s) return null;
  if (s.absolutaEm <= agora) return null;
  if (s.ultimoUso.getTime() + SESSAO_OCIOSA_MS <= agora.getTime()) return null;
  if (agora.getTime() - s.ultimoUso.getTime() > 30_000) {
    await db.update(sessoes).set({ ultimoUso: agora }).where(eq(sessoes.id, s.id));
  }
  return { id: s.id, usuarioId: s.usuarioId, mfaVerificado: s.mfaVerificado };
}

export async function sessaoDoCookie(): Promise<SessaoValida | null> {
  const jar = await cookies();
  return validarToken(jar.get(COOKIE_SESSAO)?.value);
}

export async function marcarMfaVerificado(sessaoId: string) {
  await db.update(sessoes).set({ mfaVerificado: true }).where(eq(sessoes.id, sessaoId));
}

export async function encerrarSessaoAtual() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) {
    await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.tokenHash, sha256Hex(token)));
  }
  jar.delete(COOKIE_SESSAO);
}

export async function revogarSessoesDoUsuario(usuarioId: string, exceto?: string) {
  const todas = await db
    .select({ id: sessoes.id })
    .from(sessoes)
    .where(and(eq(sessoes.usuarioId, usuarioId), isNull(sessoes.revogadaEm)));
  for (const s of todas) {
    if (s.id !== exceto) await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.id, s.id));
  }
}
