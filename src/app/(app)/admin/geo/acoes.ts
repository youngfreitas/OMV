'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { acao, type Resultado } from '@/lib/auth/acao';
import { requireUser } from '@/lib/auth/guards';
import { ErroNegocio } from '@/lib/auth/erros';
import type { AnaliseGeo } from '@/lib/geo/importador';
import { desativarBase, enviarBase, ligarEAtivar } from '@/server/geo-admin';

export async function enviarBaseAcao(fd: FormData): Promise<Resultado<{ baseId: string; analise: AnaliseGeo; ligacaoSugerida: Record<string, string> }>> {
  return acao(async () => {
    const u = await requireUser();
    const arq = fd.get('arquivo');
    if (!(arq instanceof File)) throw new ErroNegocio('Selecione um arquivo .geojson ou .json.');
    if (!/\.(geo)?json$/i.test(arq.name)) throw new ErroNegocio('Extensão não aceita: use .geojson ou .json.');
    if (arq.size > 10 * 1024 * 1024) throw new ErroNegocio('Arquivo maior que 10 MB.');
    const r = await enviarBase(u, {
      texto: await arq.text(), fonte: String(fd.get('fonte') ?? ''), versao: String(fd.get('versao') ?? ''), oficial: fd.get('oficial') === 'on',
    });
    revalidatePath('/admin/geo');
    return r;
  });
}

export async function ligarAcao(baseId: string, ligacao: Record<string, string>, ativar: boolean): Promise<Resultado> {
  return acao(async () => {
    const u = await requireUser();
    await ligarEAtivar(u, z.string().uuid().parse(baseId), z.record(z.string(), z.string().uuid()).parse(ligacao), ativar);
    revalidatePath('/admin/geo');
    revalidatePath('/mapa');
  });
}

export async function desativarAcao(baseId: string): Promise<Resultado> {
  return acao(async () => {
    await desativarBase(await requireUser(), z.string().uuid().parse(baseId));
    revalidatePath('/admin/geo');
    revalidatePath('/mapa');
  });
}
