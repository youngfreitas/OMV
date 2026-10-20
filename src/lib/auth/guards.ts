import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ErroAcesso } from './erros';
import type { Permissao } from './permissoes';
import { sessaoDoCookie } from './sessao';
import { carregarUsuario, type UsuarioAtual } from './usuario';

/** Usuário da sessão (qualquer estado de MFA/senha), ou null. Memoizado por requisição. */
export const usuarioDaSessao = cache(async (): Promise<UsuarioAtual | null> => {
  const s = await sessaoDoCookie();
  if (!s) return null;
  return carregarUsuario(s.usuarioId, s);
});

/** Pendências que impedem o uso normal do sistema, na ordem em que devem ser resolvidas. */
export function pendenciaDeAcesso(u: UsuarioAtual): string | null {
  if (u.trocarSenha) return '/conta/senha?forcada=1';
  if (u.mfaObrigatorio && !u.mfaAtivo) return '/conta/mfa';
  if (u.mfaAtivo && !u.mfaVerificado) return '/entrar/mfa';
  return null;
}

/** Para páginas e server actions: exige sessão plena (senha trocada e MFA verificado). */
export async function requireUser(opcoes: { permitirPendente?: boolean } = {}): Promise<UsuarioAtual> {
  const u = await usuarioDaSessao();
  if (!u) redirect('/entrar');
  if (!opcoes.permitirPendente) {
    const p = pendenciaDeAcesso(u);
    if (p) redirect(p);
  }
  return u;
}

export function temPermissao(u: UsuarioAtual, p: Permissao): boolean {
  return u.permissoes.has(p);
}

/** Camada de serviço: lança ErroAcesso(403). */
export function exigir(u: UsuarioAtual, ...ps: Permissao[]): void {
  if (!ps.some((p) => u.permissoes.has(p))) throw new ErroAcesso(403, 'Você não tem permissão para esta ação.');
}

/** Para páginas: redireciona para a tela de acesso negado. */
export async function requirePermission(...ps: Permissao[]): Promise<UsuarioAtual> {
  const u = await requireUser();
  if (!ps.some((p) => u.permissoes.has(p))) redirect('/acesso-negado');
  return u;
}

/** Para rotas de API: lança 401/403 (tratado por `comTratamento`). */
export async function usuarioApi(...ps: Permissao[]): Promise<UsuarioAtual> {
  const u = await usuarioDaSessao();
  if (!u) throw new ErroAcesso(401, 'Autenticação necessária.');
  if (pendenciaDeAcesso(u)) throw new ErroAcesso(403, 'Conclua a verificação de segurança da conta.');
  if (ps.length) exigir(u, ...ps);
  return u;
}

export type Escopo = { tipo: 'todas' } | { tipo: 'entidade'; entidadeId: string };

/** Escopo de leitura de submissões: todas ou só da entidade do usuário. */
export function escopoSubmissoes(u: UsuarioAtual): Escopo {
  if (u.permissoes.has('submissao:ler_todas')) return { tipo: 'todas' };
  if (u.permissoes.has('submissao:ler_proprias') && u.entidadeId) return { tipo: 'entidade', entidadeId: u.entidadeId };
  throw new ErroAcesso(403, 'Você não tem permissão para ver envios.');
}
