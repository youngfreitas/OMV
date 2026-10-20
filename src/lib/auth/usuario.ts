import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { papeis, papelPermissoes, usuarioPapeis, usuarios } from '@/lib/db/schema';
import type { Permissao } from './permissoes';

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
  entidadeId: string | null;
  papeis: string[];
  permissoes: ReadonlySet<Permissao>;
  mfaAtivo: boolean;
  mfaObrigatorio: boolean;
  trocarSenha: boolean;
  sessaoId: string;
  mfaVerificado: boolean;
};

export async function carregarUsuario(
  usuarioId: string,
  sessao: { id: string; mfaVerificado: boolean },
): Promise<UsuarioAtual | null> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  if (!u || !u.ativo) return null;
  const vinc = await db
    .select({ id: papeis.id, codigo: papeis.codigo, mfa: papeis.mfaObrigatorio })
    .from(usuarioPapeis)
    .innerJoin(papeis, eq(papeis.id, usuarioPapeis.papelId))
    .where(eq(usuarioPapeis.usuarioId, usuarioId));
  const perms = vinc.length
    ? await db
        .select({ c: papelPermissoes.permissaoCodigo })
        .from(papelPermissoes)
        .where(
          inArray(
            papelPermissoes.papelId,
            vinc.map((v) => v.id),
          ),
        )
    : [];
  return {
    id: u.id,
    email: u.email,
    nome: u.nome,
    entidadeId: u.entidadeId,
    papeis: vinc.map((v) => v.codigo),
    permissoes: new Set(perms.map((p) => p.c as Permissao)),
    mfaAtivo: u.mfaAtivo,
    mfaObrigatorio: vinc.some((v) => v.mfa),
    trocarSenha: u.trocarSenha,
    sessaoId: sessao.id,
    mfaVerificado: sessao.mfaVerificado,
  };
}
