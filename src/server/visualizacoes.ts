import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { visualizacoesSalvas } from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { ErroNegocio } from '@/lib/auth/erros';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';

export async function listarVisualizacoes(u: UsuarioAtual) {
  return db.select().from(visualizacoesSalvas).where(eq(visualizacoesSalvas.usuarioId, u.id)).orderBy(desc(visualizacoesSalvas.criadoEm)).limit(50);
}

export async function salvarVisualizacao(u: UsuarioAtual, nome: string, filtros: Record<string, string>) {
  exigir(u, 'dados:ver_agregado');
  const n = nome.trim();
  if (n.length < 2 || n.length > 80) throw new ErroNegocio('Dê um nome de 2 a 80 caracteres.');
  const limpos = Object.fromEntries(Object.entries(filtros).filter(([, v]) => typeof v === 'string' && v && v.length < 80));
  await db.insert(visualizacoesSalvas).values({ usuarioId: u.id, nome: n, filtros: limpos });
  await registrar({ usuarioId: u.id, acao: 'visualizacao.salva' });
}

export async function excluirVisualizacao(u: UsuarioAtual, id: string) {
  await db.delete(visualizacoesSalvas).where(and(eq(visualizacoesSalvas.id, id), eq(visualizacoesSalvas.usuarioId, u.id)));
}
