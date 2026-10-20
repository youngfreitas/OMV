import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { bairros, classificacoes, configuracoesMetodologicas, regioes, tags } from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { ErroNegocio } from '@/lib/auth/erros';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { NOMES_DOMINIOS } from '@/lib/dicionario/dominios';

const codigo = z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/, 'Código: 2 a 40 caracteres (letras minúsculas, números, _ ou -).');
const erro = (e: z.ZodError) => new ErroNegocio(e.issues[0]?.message ?? 'Dados inválidos.');

export async function dadosCadastros(u: UsuarioAtual) {
  exigir(u, 'cadastros:gerenciar');
  const [cl, tg, rg, br] = await Promise.all([
    db.select().from(classificacoes).orderBy(classificacoes.dominio, classificacoes.ordem),
    db.select().from(tags).orderBy(tags.nome),
    db.select().from(regioes).orderBy(regioes.nome),
    db.select().from(bairros).orderBy(bairros.nome),
  ]);
  return { classificacoes: cl, tags: tg, regioes: rg, bairros: br };
}

const sClass = z.object({
  id: z.string().uuid().optional(),
  dominio: z.enum(NOMES_DOMINIOS as [string, ...string[]]),
  codigo,
  rotulo: z.string().trim().min(2, 'Informe o rótulo.').max(120),
  definicao: z.string().trim().max(500).optional(),
  ordem: z.coerce.number().int().min(0).max(999).default(0),
  ativo: z.boolean().default(true),
  provisorio: z.boolean().default(true),
});

export async function salvarClassificacao(u: UsuarioAtual, d: unknown) {
  exigir(u, 'cadastros:gerenciar');
  const p = sClass.safeParse(d);
  if (!p.success) throw erro(p.error);
  const { id, ...v } = p.data;
  if (id) await db.update(classificacoes).set(v).where(eq(classificacoes.id, id));
  else await db.insert(classificacoes).values(v).onConflictDoUpdate({ target: [classificacoes.dominio, classificacoes.codigo], set: v });
  await registrar({ usuarioId: u.id, acao: 'cadastro.classificacao_salva', recursoTipo: 'classificacao', recursoId: id ?? `${v.dominio}:${v.codigo}` });
}

export async function salvarTag(u: UsuarioAtual, nome: string, id?: string, ativo = true) {
  exigir(u, 'cadastros:gerenciar');
  const n = nome.trim();
  if (n.length < 2 || n.length > 60) throw new ErroNegocio('Nome da etiqueta: 2 a 60 caracteres.');
  if (id) await db.update(tags).set({ nome: n, ativo }).where(eq(tags.id, id));
  else await db.insert(tags).values({ nome: n }).onConflictDoNothing();
  await registrar({ usuarioId: u.id, acao: 'cadastro.tag_salva', recursoTipo: 'tag' });
}

const sRegiao = z.object({ id: z.string().uuid().optional(), codigo, nome: z.string().trim().min(2).max(120), ativo: z.boolean().default(true), provisorio: z.boolean().default(true) });
export async function salvarRegiao(u: UsuarioAtual, d: unknown) {
  exigir(u, 'cadastros:gerenciar');
  const p = sRegiao.safeParse(d);
  if (!p.success) throw erro(p.error);
  const { id, ...v } = p.data;
  if (id) await db.update(regioes).set(v).where(eq(regioes.id, id));
  else await db.insert(regioes).values(v).onConflictDoUpdate({ target: regioes.codigo, set: v });
  await registrar({ usuarioId: u.id, acao: 'cadastro.regiao_salva', recursoTipo: 'regiao' });
}

const sBairro = z.object({ id: z.string().uuid().optional(), codigo, nome: z.string().trim().min(2).max(120), regiaoId: z.string().uuid().nullable().optional(), ativo: z.boolean().default(true), provisorio: z.boolean().default(true) });
export async function salvarBairro(u: UsuarioAtual, d: unknown) {
  exigir(u, 'cadastros:gerenciar');
  const p = sBairro.safeParse(d);
  if (!p.success) throw erro(p.error);
  const { id, ...v } = p.data;
  if (id) await db.update(bairros).set({ ...v, regiaoId: v.regiaoId ?? null }).where(eq(bairros.id, id));
  else await db.insert(bairros).values({ ...v, regiaoId: v.regiaoId ?? null }).onConflictDoUpdate({ target: bairros.codigo, set: { ...v, regiaoId: v.regiaoId ?? null } });
  await registrar({ usuarioId: u.id, acao: 'cadastro.bairro_salvo', recursoTipo: 'bairro' });
}

/* ───── Configurações metodológicas ───── */
const VALIDADORES: Record<string, z.ZodType> = {
  'supressao.k': z.number().int().min(2).max(50),
  'supressao.complementar': z.boolean(),
  'territorio.generalizar_para_regiao': z.boolean(),
  'filtros.max_dimensoes': z.number().int().min(1).max(3),
  'retencao.arquivos_dias': z.number().int().min(1).max(3650),
  'retencao.rascunhos_dias': z.number().int().min(1).max(3650),
  'fluxo.segregacao_aprovador': z.boolean(),
  'validacao.variacao_alerta_pct': z.number().int().min(5).max(1000),
};

export async function listarConfiguracoes(u: UsuarioAtual) {
  exigir(u, 'config:metodologia');
  return db.select().from(configuracoesMetodologicas).orderBy(configuracoesMetodologicas.chave);
}

export async function salvarConfiguracao(u: UsuarioAtual, chave: string, valor: unknown, validado: boolean) {
  exigir(u, 'config:metodologia');
  const v = VALIDADORES[chave];
  if (!v) throw new ErroNegocio('Parâmetro desconhecido.');
  const p = v.safeParse(valor);
  if (!p.success) throw new ErroNegocio('Valor inválido para este parâmetro.');
  const [antes] = await db.select().from(configuracoesMetodologicas).where(eq(configuracoesMetodologicas.chave, chave));
  await db
    .update(configuracoesMetodologicas)
    .set({ valor: p.data as never, provisorio: !validado, atualizadoEm: new Date(), atualizadoPor: u.id })
    .where(eq(configuracoesMetodologicas.chave, chave));
  await registrar({ usuarioId: u.id, acao: 'config.alterada', recursoTipo: 'configuracao', recursoId: chave, detalhes: { de: antes?.valor as unknown, para: p.data as unknown, validado } });
}

export { sql };
