'use server';

import { revalidatePath } from 'next/cache';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import { salvarBairro, salvarClassificacao, salvarConfiguracao, salvarRegiao, salvarTag } from '@/server/cadastros-admin';

const bool = (v: FormDataEntryValue | null) => v === 'on' || v === 'true';

export async function classificacaoAcao(_: unknown, fd: FormData): Promise<Resultado> {
  return acao(async () => {
    await salvarClassificacao(await requireUser(), {
      id: String(fd.get('id') ?? '') || undefined, dominio: fd.get('dominio'), codigo: fd.get('codigo'), rotulo: fd.get('rotulo'),
      definicao: String(fd.get('definicao') ?? '') || undefined, ordem: fd.get('ordem') || 0, ativo: bool(fd.get('ativo')), provisorio: bool(fd.get('provisorio')),
    });
    revalidatePath('/admin/cadastros');
  });
}
export async function tagAcao(_: unknown, fd: FormData): Promise<Resultado> {
  return acao(async () => {
    await salvarTag(await requireUser(), String(fd.get('nome') ?? ''));
    revalidatePath('/admin/cadastros');
  });
}
export async function regiaoAcao(_: unknown, fd: FormData): Promise<Resultado> {
  return acao(async () => {
    await salvarRegiao(await requireUser(), { id: String(fd.get('id') ?? '') || undefined, codigo: fd.get('codigo'), nome: fd.get('nome'), ativo: bool(fd.get('ativo')), provisorio: bool(fd.get('provisorio')) });
    revalidatePath('/admin/cadastros');
  });
}
export async function bairroAcao(_: unknown, fd: FormData): Promise<Resultado> {
  return acao(async () => {
    await salvarBairro(await requireUser(), { id: String(fd.get('id') ?? '') || undefined, codigo: fd.get('codigo'), nome: fd.get('nome'), regiaoId: String(fd.get('regiaoId') ?? '') || null, ativo: bool(fd.get('ativo')), provisorio: bool(fd.get('provisorio')) });
    revalidatePath('/admin/cadastros');
  });
}
export async function configAcao(chave: string, valor: unknown, validado: boolean): Promise<Resultado> {
  return acao(async () => {
    await salvarConfiguracao(await requireUser(), chave, valor, validado);
    revalidatePath('/admin/configuracoes');
  });
}
