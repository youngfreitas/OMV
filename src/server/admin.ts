import 'server-only';
import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import {
  auditoria,
  entidades,
  papeis,
  papelPermissoes,
  permissoes,
  sessoes,
  usuarioPapeis,
  usuarios,
} from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { ErroNegocio } from '@/lib/auth/erros';
import { exigir } from '@/lib/auth/guards';
import { hashSenha } from '@/lib/auth/senha';
import { revogarSessoesDoUsuario } from '@/lib/auth/sessao';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { PAPEIS_PADRAO, TODAS_PERMISSOES, type Permissao } from '@/lib/auth/permissoes';
import { senhaAleatoria } from '@/lib/seed';

/* ───────── Entidades ───────── */

export const TIPOS_ENTIDADE = [
  { value: 'assistencia_social', label: 'Assistência social' },
  { value: 'saude', label: 'Saúde' },
  { value: 'seguranca', label: 'Segurança pública' },
  { value: 'justica', label: 'Sistema de justiça' },
  { value: 'sociedade_civil', label: 'Sociedade civil' },
  { value: 'outra', label: 'Outra' },
];

export async function listarEntidades(u: UsuarioAtual) {
  exigir(u, 'entidades:gerenciar');
  return db.select().from(entidades).orderBy(entidades.nome);
}

const schemaEntidade = z.object({
  nome: z.string().trim().min(3, 'Informe o nome da entidade.').max(160),
  tipo: z.string().min(1),
  observacoes: z.string().trim().max(500).optional(),
});

export async function salvarEntidade(u: UsuarioAtual, id: string | null, dados: unknown) {
  exigir(u, 'entidades:gerenciar');
  const p = schemaEntidade.safeParse(dados);
  if (!p.success) throw new ErroNegocio(p.error.issues[0]?.message ?? 'Dados inválidos.');
  if (id) {
    await db.update(entidades).set({ ...p.data, atualizadoEm: new Date() }).where(eq(entidades.id, id));
    await registrar({ usuarioId: u.id, acao: 'entidade.atualizada', recursoTipo: 'entidade', recursoId: id });
    return id;
  }
  const [e] = await db.insert(entidades).values(p.data).returning();
  await registrar({ usuarioId: u.id, acao: 'entidade.criada', recursoTipo: 'entidade', recursoId: e!.id });
  return e!.id;
}

export async function alternarEntidade(u: UsuarioAtual, id: string, ativo: boolean) {
  exigir(u, 'entidades:gerenciar');
  await db.update(entidades).set({ ativo, atualizadoEm: new Date() }).where(eq(entidades.id, id));
  await registrar({ usuarioId: u.id, acao: ativo ? 'entidade.ativada' : 'entidade.desativada', recursoTipo: 'entidade', recursoId: id });
}

/* ───────── Usuários ───────── */

export async function listarUsuarios(u: UsuarioAtual) {
  exigir(u, 'usuarios:gerenciar');
  const lista = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      ativo: usuarios.ativo,
      bloqueadoAte: usuarios.bloqueadoAte,
      mfaAtivo: usuarios.mfaAtivo,
      ultimoAcesso: usuarios.ultimoAcesso,
      entidade: entidades.nome,
      entidadeId: usuarios.entidadeId,
    })
    .from(usuarios)
    .leftJoin(entidades, eq(entidades.id, usuarios.entidadeId))
    .orderBy(usuarios.nome);
  const vinc = await db
    .select({ usuarioId: usuarioPapeis.usuarioId, codigo: papeis.codigo })
    .from(usuarioPapeis)
    .innerJoin(papeis, eq(papeis.id, usuarioPapeis.papelId));
  return lista.map((l) => ({ ...l, papeis: vinc.filter((v) => v.usuarioId === l.id).map((v) => v.codigo) }));
}

const schemaUsuario = z.object({
  nome: z.string().trim().min(3, 'Informe o nome.').max(160),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(200),
  papel: z.enum(['administrador', 'gestor', 'analista', 'entidade', 'visualizador']),
  entidadeId: z.string().uuid().nullable().optional(),
});

export async function criarUsuarioAdmin(u: UsuarioAtual, dados: unknown): Promise<{ senhaTemporaria: string }> {
  exigir(u, 'usuarios:gerenciar');
  const p = schemaUsuario.safeParse(dados);
  if (!p.success) throw new ErroNegocio(p.error.issues[0]?.message ?? 'Dados inválidos.');
  if (p.data.papel === 'entidade' && !p.data.entidadeId) throw new ErroNegocio('Usuários do perfil Entidade precisam de uma entidade.');
  const [ja] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.email}) = ${p.data.email}`);
  if (ja) throw new ErroNegocio('Já existe um usuário com este e-mail.');
  const senha = senhaAleatoria();
  const [papel] = await db.select().from(papeis).where(eq(papeis.codigo, p.data.papel));
  if (!papel) throw new ErroNegocio('Perfil inexistente.');
  const [novo] = await db
    .insert(usuarios)
    .values({
      email: p.data.email,
      nome: p.data.nome,
      senhaHash: await hashSenha(senha),
      entidadeId: p.data.papel === 'entidade' ? (p.data.entidadeId ?? null) : null,
      trocarSenha: true,
    })
    .returning();
  await db.insert(usuarioPapeis).values({ usuarioId: novo!.id, papelId: papel.id });
  await registrar({ usuarioId: u.id, acao: 'usuario.criado', recursoTipo: 'usuario', recursoId: novo!.id, detalhes: { papel: p.data.papel } });
  return { senhaTemporaria: senha };
}

export async function redefinirSenhaAdmin(u: UsuarioAtual, alvoId: string): Promise<{ senhaTemporaria: string }> {
  exigir(u, 'usuarios:gerenciar');
  const senha = senhaAleatoria();
  await db.update(usuarios).set({ senhaHash: await hashSenha(senha), trocarSenha: true }).where(eq(usuarios.id, alvoId));
  await revogarSessoesDoUsuario(alvoId);
  await registrar({ usuarioId: u.id, acao: 'usuario.senha_redefinida_admin', recursoTipo: 'usuario', recursoId: alvoId });
  return { senhaTemporaria: senha };
}

export async function redefinirMfaAdmin(u: UsuarioAtual, alvoId: string) {
  exigir(u, 'usuarios:gerenciar');
  await db.update(usuarios).set({ mfaAtivo: false, mfaSegredoCifrado: null, codigosRecuperacaoHash: null }).where(eq(usuarios.id, alvoId));
  await revogarSessoesDoUsuario(alvoId);
  await registrar({ usuarioId: u.id, acao: 'usuario.mfa_redefinido', recursoTipo: 'usuario', recursoId: alvoId });
}

export async function alternarUsuario(u: UsuarioAtual, alvoId: string, ativo: boolean) {
  exigir(u, 'usuarios:gerenciar');
  if (alvoId === u.id && !ativo) throw new ErroNegocio('Você não pode desativar a própria conta.');
  await db.update(usuarios).set({ ativo }).where(eq(usuarios.id, alvoId));
  if (!ativo) await revogarSessoesDoUsuario(alvoId);
  await registrar({ usuarioId: u.id, acao: ativo ? 'usuario.ativado' : 'usuario.desativado', recursoTipo: 'usuario', recursoId: alvoId });
}

export async function historicoAcessos(u: UsuarioAtual, alvoId: string) {
  exigir(u, 'usuarios:gerenciar');
  const eventos = await db
    .select({ quando: auditoria.ocorridoEm, acao: auditoria.acao, ip: auditoria.ip })
    .from(auditoria)
    .where(and(eq(auditoria.usuarioId, alvoId), sql`${auditoria.acao} like 'login.%' or ${auditoria.acao} like 'mfa.%' or ${auditoria.acao} = 'logout'`))
    .orderBy(desc(auditoria.ocorridoEm))
    .limit(30);
  const ativas = await db
    .select({ id: sessoes.id, criadoEm: sessoes.criadoEm, ultimoUso: sessoes.ultimoUso, ip: sessoes.ip })
    .from(sessoes)
    .where(and(eq(sessoes.usuarioId, alvoId), sql`${sessoes.revogadaEm} is null`, sql`${sessoes.absolutaEm} > now()`));
  return { eventos, ativas };
}

/* ───────── Perfis e permissões ───────── */

export async function matrizPerfis(u: UsuarioAtual) {
  exigir(u, 'papeis:gerenciar');
  const ps = await db.select().from(papeis).orderBy(papeis.nome);
  const vinc = await db.select().from(papelPermissoes);
  const perms = await db.select().from(permissoes).orderBy(permissoes.codigo);
  return {
    papeis: ps.map((p) => ({ ...p, permissoes: vinc.filter((v) => v.papelId === p.id).map((v) => v.permissaoCodigo as Permissao) })),
    permissoes: perms,
  };
}

export async function salvarPermissoesPapel(u: UsuarioAtual, papelId: string, lista: string[]) {
  exigir(u, 'papeis:gerenciar');
  const validas = lista.filter((p): p is Permissao => (TODAS_PERMISSOES as string[]).includes(p));
  const [papel] = await db.select().from(papeis).where(eq(papeis.id, papelId));
  if (!papel) throw new ErroNegocio('Perfil inexistente.');
  if (papel.codigo === 'administrador') {
    for (const essencial of ['usuarios:gerenciar', 'papeis:gerenciar', 'auditoria:ler'] as Permissao[]) {
      if (!validas.includes(essencial)) throw new ErroNegocio('O administrador deve manter usuários, perfis e auditoria.');
    }
  }
  await db.delete(papelPermissoes).where(eq(papelPermissoes.papelId, papelId));
  if (validas.length) await db.insert(papelPermissoes).values(validas.map((c) => ({ papelId, permissaoCodigo: c })));
  await registrar({ usuarioId: u.id, acao: 'perfil.permissoes_alteradas', recursoTipo: 'papel', recursoId: papelId, detalhes: { total: validas.length } });
}

export function permissoesPadraoDoPapel(codigo: string): Permissao[] {
  return PAPEIS_PADRAO[codigo as keyof typeof PAPEIS_PADRAO]?.permissoes ?? [];
}

/* ───────── Auditoria ───────── */

export async function consultarAuditoria(
  u: UsuarioAtual,
  f: { acao?: string; usuario?: string; pagina?: number; porPagina?: number },
) {
  exigir(u, 'auditoria:ler');
  const porPagina = Math.min(f.porPagina ?? 50, 200);
  const pagina = Math.max(f.pagina ?? 1, 1);
  const filtros = [];
  if (f.acao) filtros.push(ilike(auditoria.acao, `${f.acao}%`));
  if (f.usuario) {
    const ids = await db.select({ id: usuarios.id }).from(usuarios).where(ilike(usuarios.email, `%${f.usuario}%`));
    filtros.push(inArray(auditoria.usuarioId, ids.length ? ids.map((i) => i.id) : ['00000000-0000-0000-0000-000000000000']));
  }
  const where = filtros.length ? and(...filtros) : undefined;
  const linhas = await db
    .select({
      id: auditoria.id,
      quando: auditoria.ocorridoEm,
      acao: auditoria.acao,
      usuario: usuarios.email,
      recursoTipo: auditoria.recursoTipo,
      recursoId: auditoria.recursoId,
      ip: auditoria.ip,
      detalhes: auditoria.detalhes,
    })
    .from(auditoria)
    .leftJoin(usuarios, eq(usuarios.id, auditoria.usuarioId))
    .where(where)
    .orderBy(desc(auditoria.id))
    .limit(porPagina)
    .offset((pagina - 1) * porPagina);
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(auditoria).where(where)) as [{ n: number }];
  return { linhas, total: n, pagina, porPagina };
}
