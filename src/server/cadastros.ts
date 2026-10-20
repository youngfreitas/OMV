import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bairros, classificacoes, configuracoesMetodologicas } from '@/lib/db/schema';
import { dominiosPadrao, type Dominios } from '@/lib/dicionario/dominios';

/** Domínios ativos (do cadastro). Se o cadastro estiver vazio, usa o padrão provisório do dicionário. */
export async function carregarDominios(): Promise<Dominios> {
  const linhas = await db
    .select()
    .from(classificacoes)
    .where(eq(classificacoes.ativo, true))
    .orderBy(asc(classificacoes.dominio), asc(classificacoes.ordem));
  if (linhas.length === 0) return dominiosPadrao();
  const out: Dominios = {};
  for (const l of linhas) {
    (out[l.dominio] ??= []).push({
      codigo: l.codigo,
      rotulo: l.rotulo,
      definicao: l.definicao ?? undefined,
      unidadesPermitidas: (l.metadados as { unidadesPermitidas?: string[] } | null)?.unidadesPermitidas,
    });
  }
  return out;
}

export async function carregarBairros(apenasAtivos = true) {
  const q = db.select({ codigo: bairros.codigo, nome: bairros.nome, ativo: bairros.ativo, id: bairros.id, regiaoId: bairros.regiaoId }).from(bairros);
  return (apenasAtivos ? await q.where(and(eq(bairros.ativo, true))) : await q).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function configuracao<T = unknown>(chave: string, padrao: T): Promise<T> {
  const [c] = await db.select().from(configuracoesMetodologicas).where(eq(configuracoesMetodologicas.chave, chave));
  return (c?.valor as T) ?? padrao;
}
