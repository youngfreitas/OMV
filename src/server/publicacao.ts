import 'server-only';
import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { indicadoresPublicados, publicacoes, registrosAprovados } from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { ErroNegocio } from '@/lib/auth/erros';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { calcularIndicadores } from '@/lib/publicacao/motor';
import type { DominiosCubos, RegistroAgregavel } from '@/lib/publicacao/tipos';
import { configuracao } from '@/server/cadastros';
import { carregarFonte, type FonteBase } from '@/server/fonte';
import { notificarPorPermissao } from '@/server/notificacoes';

export const ID_MUNICIPIO = '3555406';

export async function parametrosDaPublicacao() {
  const [k, complementar, generalizar, maxDim] = await Promise.all([
    configuracao<number>('supressao.k', 5),
    configuracao<boolean>('supressao.complementar', true),
    configuracao<boolean>('territorio.generalizar_para_regiao', true),
    configuracao<number>('filtros.max_dimensoes', 2),
  ]);
  return { k, complementar, generalizar, maxDimensoes: maxDim };
}

/** Agregação + supressão estatística sobre os registros aprovados ATIVOS (publicação e dashboard interno). */
export async function calcularSobreBaseAnalitica(fonteExistente?: FonteBase) {
  const [fonte, params] = await Promise.all([fonteExistente ?? carregarFonte({ permitirDemo: false }), parametrosDaPublicacao()]);
  const registros: RegistroAgregavel[] = fonte.registros.map((r) => ({
    periodo: r.periodo,
    bairroId: r.bairroId,
    regiaoId: r.regiaoId,
    tipoRegistro: r.tipoRegistro,
    unidade: r.unidade,
    categoria: r.categoria,
    faixa: r.faixa,
    quantidade: r.quantidade,
  }));
  const dom: DominiosCubos = {
    categoria: (fonte.dominios.categoria_violencia ?? []).map((i) => i.codigo),
    faixa: (fonte.dominios.faixa_etaria ?? []).map((i) => i.codigo),
    tipo: (fonte.dominios.tipo_registro ?? []).map((i) => i.codigo),
  };
  const r = calcularIndicadores(registros, fonte.territorio, dom, { k: params.k, complementar: params.complementar });
  return { ...r, params, totalRegistros: registros.length, fonte };
}

export async function publicacaoAtual() {
  const [p] = await db.select().from(publicacoes).where(eq(publicacoes.status, 'publicada')).orderBy(desc(publicacoes.versao)).limit(1);
  return p ?? null;
}

/** Há aprovação ou retirada posterior à geração da publicação vigente? */
export async function publicacaoDesatualizada(): Promise<boolean> {
  const p = await publicacaoAtual();
  if (!p) return false;
  const [x] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(registrosAprovados)
    .where(or(gt(registrosAprovados.aprovadoEm, p.geradaEm), gt(registrosAprovados.retiradoEm, p.geradaEm)));
  return (x?.n ?? 0) > 0;
}

export async function listarPublicacoes(u: UsuarioAtual) {
  exigir(u, 'publicacao:ler');
  return db.select().from(publicacoes).orderBy(desc(publicacoes.versao)).limit(50);
}

async function gerar(usuarioId: string | null) {
  const { indicadores, relatorio, params, totalRegistros } = await calcularSobreBaseAnalitica();
  if (totalRegistros === 0) throw new ErroNegocio('Não há registros aprovados para publicar.', 'sem_dados');
  return db.transaction(async (tx) => {
    const [{ v }] = (await tx.select({ v: sql<number>`coalesce(max(${publicacoes.versao}), 0)::int` }).from(publicacoes)) as [{ v: number }];
    const [p] = await tx
      .insert(publicacoes)
      .values({ versao: v + 1, status: 'rascunho', parametros: { k: params.k, complementar: params.complementar, generalizar: params.generalizar, maxDimensoes: params.maxDimensoes, provisorio: true } as never, relatorioSupressao: relatorio as never, geradaPor: usuarioId })
      .returning();
    const lote = 2000;
    for (let i = 0; i < indicadores.length; i += lote) {
      await tx.insert(indicadoresPublicados).values(
        indicadores.slice(i, i + lote).map((x) => ({
          publicacaoId: p!.id,
          cubo: x.cubo,
          periodo: x.periodo,
          unidade: x.unidade,
          territorioTipo: x.territorioTipo,
          territorioId: x.territorioId,
          dimensao: x.dimensao,
          valor: x.valor,
          suprimido: x.suprimido,
          motivo: x.motivo,
        })),
      );
    }
    return p!;
  });
}

async function ativar(id: string, usuarioId: string | null) {
  await db.transaction(async (tx) => {
    await tx.update(publicacoes).set({ status: 'substituida' }).where(eq(publicacoes.status, 'publicada'));
    await tx.update(publicacoes).set({ status: 'publicada', publicadaEm: new Date(), publicadaPor: usuarioId }).where(eq(publicacoes.id, id));
  });
}

export async function gerarPublicacao(u: UsuarioAtual) {
  exigir(u, 'publicacao:publicar');
  const p = await gerar(u.id);
  await registrar({ usuarioId: u.id, acao: 'publicacao.gerada', recursoTipo: 'publicacao', recursoId: p.id, detalhes: { versao: p.versao } });
  return p;
}

export async function publicar(u: UsuarioAtual, id: string) {
  exigir(u, 'publicacao:publicar');
  const [p] = await db.select().from(publicacoes).where(eq(publicacoes.id, id));
  if (!p) throw new ErroNegocio('Publicação não encontrada.');
  if (p.status !== 'rascunho') throw new ErroNegocio('Somente publicações geradas e ainda não publicadas podem ser publicadas.', 'estado_invalido');
  await ativar(id, u.id);
  await registrar({ usuarioId: u.id, acao: 'publicacao.publicada', recursoTipo: 'publicacao', recursoId: id, detalhes: { versao: p.versao } });
}

export async function retirarPublicacao(u: UsuarioAtual, id: string, motivo: string) {
  exigir(u, 'publicacao:retirar');
  if (motivo.trim().length < 10) throw new ErroNegocio('Informe o motivo da retirada (mínimo de 10 caracteres).', 'justificativa');
  const [p] = await db.select().from(publicacoes).where(and(eq(publicacoes.id, id), eq(publicacoes.status, 'publicada')));
  if (!p) throw new ErroNegocio('Publicação vigente não encontrada.');
  await db.update(publicacoes).set({ status: 'retirada' }).where(eq(publicacoes.id, id));
  await registrar({ usuarioId: u.id, acao: 'publicacao.retirada', recursoTipo: 'publicacao', recursoId: id, detalhes: { versao: p.versao, motivo } });
}

/** Chamada quando um envio aprovado é retirado: se há publicação vigente, republica sem os registros retirados. */
export async function republicarPorRetirada(usuarioId: string) {
  const vigente = await publicacaoAtual();
  if (!vigente) return null;
  try {
    const p = await gerar(usuarioId);
    await ativar(p.id, usuarioId);
    await registrar({ usuarioId, acao: 'publicacao.republicada_por_retirada', recursoTipo: 'publicacao', recursoId: p.id, detalhes: { versao: p.versao, anterior: vigente.versao } });
    return p;
  } catch (e) {
    if (e instanceof ErroNegocio && e.codigo === 'sem_dados') {
      // Nada mais a publicar: a publicação vigente deve sair do ar.
      await db.update(publicacoes).set({ status: 'retirada' }).where(eq(publicacoes.id, vigente.id));
      await registrar({ usuarioId, acao: 'publicacao.retirada_automatica', recursoTipo: 'publicacao', recursoId: vigente.id, detalhes: { motivo: 'sem registros aprovados ativos' } });
      return null;
    }
    await notificarPorPermissao('publicacao:publicar', { tipo: 'republicacao_necessaria', titulo: 'Republicação necessária após retirada de envio', link: '/admin/publicacao' });
    throw e;
  }
}
