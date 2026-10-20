'use server';

import { revalidatePath } from 'next/cache';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import {
  alternarEntidade,
  alternarUsuario,
  criarUsuarioAdmin,
  redefinirMfaAdmin,
  redefinirSenhaAdmin,
  salvarEntidade,
  salvarPermissoesPapel,
} from '@/server/admin';

export async function criarEntidadeAcao(_: unknown, fd: FormData): Promise<Resultado> {
  return acao(async () => {
    const u = await requireUser();
    await salvarEntidade(u, null, { nome: fd.get('nome'), tipo: fd.get('tipo'), observacoes: String(fd.get('observacoes') ?? '') || undefined });
    revalidatePath('/admin/entidades');
  });
}

export async function alternarEntidadeAcao(id: string, ativo: boolean): Promise<Resultado> {
  return acao(async () => {
    await alternarEntidade(await requireUser(), id, ativo);
    revalidatePath('/admin/entidades');
  });
}

export async function criarUsuarioAcao(_: unknown, fd: FormData): Promise<Resultado<{ senhaTemporaria: string }>> {
  return acao(async () => {
    const u = await requireUser();
    const r = await criarUsuarioAdmin(u, {
      nome: fd.get('nome'),
      email: fd.get('email'),
      papel: fd.get('papel'),
      entidadeId: String(fd.get('entidadeId') ?? '') || null,
    });
    revalidatePath('/admin/usuarios');
    return r;
  });
}

export async function redefinirSenhaAcao(id: string): Promise<Resultado<{ senhaTemporaria: string }>> {
  return acao(async () => redefinirSenhaAdmin(await requireUser(), id));
}

export async function redefinirMfaAcao(id: string): Promise<Resultado> {
  return acao(async () => {
    await redefinirMfaAdmin(await requireUser(), id);
    revalidatePath('/admin/usuarios');
  });
}

export async function alternarUsuarioAcao(id: string, ativo: boolean): Promise<Resultado> {
  return acao(async () => {
    await alternarUsuario(await requireUser(), id, ativo);
    revalidatePath('/admin/usuarios');
  });
}

export async function salvarPerfilAcao(papelId: string, permissoes: string[]): Promise<Resultado> {
  return acao(async () => {
    await salvarPermissoesPapel(await requireUser(), papelId, permissoes);
    revalidatePath('/admin/perfis');
  });
}
