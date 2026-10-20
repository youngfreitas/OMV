import 'server-only';
import { and, desc, eq, ilike, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  bairros,
  comentariosTecnicos,
  decisoesAnalise,
  entidades,
  pendencias,
  registroHistorico,
  registrosAprovados,
  registrosRecebidos,
  submissoes,
  usuarios,
} from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { ErroNegocio } from '@/lib/auth/erros';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { EXIGE_JUSTIFICATIVA, PERMISSAO_DA_ACAO, proximoStatus, type AcaoFluxo, type Status } from '@/lib/fluxo/maquina';
import { mesDe } from '@/lib/validacao/normalizar';
import type { LinhaNormalizada } from '@/lib/validacao/tipos';
import { configuracao } from '@/server/cadastros';
import { notificar } from '@/server/notificacoes';
import { obterComAcesso } from '@/server/submissoes';

const FILA: Status[] = ['aguardando_analise', 'reenviado', 'em_analise', 'pendente_correcao', 'aprovado', 'rejeitado', 'retirado'];

export async function filaAnalise(
  u: UsuarioAtual,
  f: { status?: string; entidadeId?: string; busca?: string; restrita?: boolean } = {},
) {
  exigir(u, 'analise:ler');
  const cond = [inArray(submissoes.status, FILA)];
  if (f.status) cond.push(eq(submissoes.status, f.status));
  if (f.entidadeId) cond.push(eq(submissoes.entidadeId, f.entidadeId));
  if (f.busca) cond.push(ilike(submissoes.protocolo, `%${f.busca}%`));
  if (f.restrita) cond.push(eq(submissoes.restrita, true));
  const linhas = await db
    .select({
      id: submissoes.id,
      protocolo: submissoes.protocolo,
      status: submissoes.status,
      entidade: entidades.nome,
      periodoInicio: submissoes.periodoInicio,
      periodoFim: submissoes.periodoFim,
      tipoEntrada: submissoes.tipoEntrada,
      restrita: submissoes.restrita,
      enviadoEm: submissoes.enviadoEm,
      pendenciasAbertas: sql<number>`(select count(*)::int from pendencias p where p.submissao_id = ${submissoes.id} and p.status = 'aberta')`,
    })
    .from(submissoes)
    .innerJoin(entidades, eq(entidades.id, submissoes.entidadeId))
    .where(and(...cond))
    .orderBy(desc(submissoes.enviadoEm))
    .limit(300);
  return linhas;
}

export async function metricasAnalise(u: UsuarioAtual) {
  exigir(u, 'analise:ler');
  const porStatus = await db
    .select({ status: submissoes.status, n: sql<number>`count(*)::int` })
    .from(submissoes)
    .where(ne(submissoes.status, 'rascunho'))
    .groupBy(submissoes.status);
  const get = (s: string) => porStatus.find((p) => p.status === s)?.n ?? 0;
  const [tempo] = await db
    .select({
      horasDecisao: sql<number | null>`avg(extract(epoch from (${submissoes.decididoEm} - ${submissoes.enviadoEm})) / 3600)::float`,
    })
    .from(submissoes)
    .where(and(sql`${submissoes.decididoEm} is not null`, sql`${submissoes.enviadoEm} is not null`, sql`${submissoes.decididoEm} > now() - interval '90 days'`));
  const [espera] = await db
    .select({ horas: sql<number | null>`avg(extract(epoch from (now() - ${submissoes.enviadoEm})) / 3600)::float` })
    .from(submissoes)
    .where(inArray(submissoes.status, ['aguardando_analise', 'reenviado']));
  const [restritos] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(submissoes)
    .where(and(eq(submissoes.restrita, true), inArray(submissoes.status, ['aguardando_analise', 'reenviado', 'em_analise', 'pendente_correcao'])));
  return {
    aguardando: get('aguardando_analise') + get('reenviado'),
    emAnalise: get('em_analise'),
    pendentesCorrecao: get('pendente_correcao'),
    aprovados: get('aprovado'),
    restritos: restritos?.n ?? 0,
    horasMediaDecisao: tempo?.horasDecisao ?? null,
    horasMediaEspera: espera?.horas ?? null,
  };
}

type EntradaAcao = {
  justificativa?: string;
  pendencias?: Array<{ linha?: number; campo?: string; descricao: string }>;
};

async function notificarEntidade(entidadeId: string, n: { tipo: string; titulo: string; texto?: string; link: string }) {
  const alvos = await db.select({ id: usuarios.id }).from(usuarios).where(and(eq(usuarios.entidadeId, entidadeId), eq(usuarios.ativo, true)));
  for (const a of alvos) await notificar(a.id, n);
}

/** Executa uma transição do fluxo com todas as regras de negócio. */
export async function executarAcao(u: UsuarioAtual, id: string, acao: AcaoFluxo, entrada: EntradaAcao = {}) {
  if (acao === 'enviar' || acao === 'reenviar') throw new ErroNegocio('Ação reservada à entidade.');
  exigir(u, PERMISSAO_DA_ACAO[acao]);
  const s = await obterComAcesso(u, id);
  const destino = proximoStatus(s.status as Status, acao);
  if (!destino) throw new ErroNegocio('Esta ação não está disponível para a situação atual do envio.', 'estado_invalido');
  const just = entrada.justificativa?.trim();
  if (EXIGE_JUSTIFICATIVA.includes(acao) && (!just || just.length < 10)) {
    throw new ErroNegocio('Informe uma justificativa (mínimo de 10 caracteres).', 'justificativa');
  }

  if (acao === 'aprovar') {
    if (s.restrita) throw new ErroNegocio('Envio restrito (possível dado pessoal): devolva ou rejeite; não pode ser aprovado.', 'restrito');
    if (await configuracao<boolean>('fluxo.segregacao_aprovador', true)) {
      if (s.enviadoPor === u.id || s.criadoPor === u.id) throw new ErroNegocio('Quem enviou o envio não pode aprová-lo (segregação de funções).', 'segregacao');
    }
    const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(pendencias).where(and(eq(pendencias.submissaoId, id), eq(pendencias.status, 'aberta')))) as [{ n: number }];
    if (n > 0) throw new ErroNegocio('Há pendências abertas. Resolva-as ou devolva o envio.', 'pendencias');
  }

  await db.transaction(async (tx) => {
    if (acao === 'aprovar') {
      const regs = await tx
        .select()
        .from(registrosRecebidos)
        .where(and(eq(registrosRecebidos.submissaoId, id), eq(registrosRecebidos.versaoNumero, s.versaoAtual)));
      if (regs.length === 0) throw new ErroNegocio('O envio não possui registros.', 'sem_registros');
      const bs = await tx.select().from(bairros);
      const linhas = regs.map((r) => ({ r, n: (r.dados as { normalizada: LinhaNormalizada }).normalizada }));
      if (linhas.some((l) => l.r.statusValidacao === 'erro' || l.n.invalida)) throw new ErroNegocio('Existem linhas com erro: devolva o envio para correção.', 'linhas_invalidas');
      const valores = linhas.map(({ n }) => {
        const b = bs.find((x) => x.codigo === n.bairro);
        if (!b) throw new ErroNegocio(`Bairro da linha ${n.linha} não existe mais no cadastro.`, 'bairro');
        return {
          submissaoId: id,
          entidadeId: s.entidadeId,
          linha: n.linha,
          periodo: mesDe(n.periodo_inicio),
          periodoInicio: n.periodo_inicio,
          periodoFim: n.periodo_fim,
          bairroId: b.id,
          regiaoId: b.regiaoId,
          tipoRegistro: n.tipo_registro,
          unidadeContagem: n.unidade_contagem,
          categoriaViolencia: n.categoria_violencia,
          faixaEtaria: n.faixa_etaria,
          tipoAtendimento: n.tipo_atendimento ?? null,
          canalEntrada: n.canal_entrada ?? null,
          relacaoAutor: n.relacao_autor ?? null,
          situacaoAtendimento: n.situacao_atendimento ?? null,
          quantidade: n.quantidade,
          aprovadoPor: u.id,
        };
      });
      const novos = await tx.insert(registrosAprovados).values(valores).returning({ id: registrosAprovados.id });
      await tx.insert(registroHistorico).values(novos.map((x) => ({ registroId: x.id, acao: 'aprovado', usuarioId: u.id, dados: { submissaoId: id } })));
    }
    if (acao === 'retirar') {
      const ativos = await tx
        .update(registrosAprovados)
        .set({ ativo: false, retiradoEm: new Date() })
        .where(and(eq(registrosAprovados.submissaoId, id), eq(registrosAprovados.ativo, true)))
        .returning({ id: registrosAprovados.id });
      if (ativos.length) await tx.insert(registroHistorico).values(ativos.map((x) => ({ registroId: x.id, acao: 'retirado', usuarioId: u.id, dados: { motivo: just } })));
    }
    if (acao === 'devolver' && entrada.pendencias?.length) {
      await tx.insert(pendencias).values(
        entrada.pendencias.filter((p) => p.descricao.trim()).map((p) => ({ submissaoId: id, linha: p.linha, campo: p.campo, descricao: p.descricao.trim().slice(0, 500), criadoPor: u.id })),
      );
    }
    await tx
      .update(submissoes)
      .set({ status: destino, atualizadoEm: new Date(), ...(['aprovado', 'rejeitado', 'retirado'].includes(destino) ? { decididoEm: new Date() } : {}) })
      .where(eq(submissoes.id, id));
    await tx.insert(decisoesAnalise).values({ submissaoId: id, acao, deStatus: s.status, paraStatus: destino, justificativa: just, usuarioId: u.id });
    await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: `analise.${acao}`, recursoTipo: 'submissao', recursoId: id, detalhes: { de: s.status, para: destino } }, tx);
  });

  const link = `/entidade/envios/${id}`;
  if (acao === 'aprovar') await notificarEntidade(s.entidadeId, { tipo: 'envio_aprovado', titulo: `Envio ${s.protocolo} aprovado`, link });
  if (acao === 'devolver') await notificarEntidade(s.entidadeId, { tipo: 'envio_devolvido', titulo: `Envio ${s.protocolo}: correção solicitada`, texto: 'Abra o envio para ver as pendências.', link });
  if (acao === 'rejeitar') await notificarEntidade(s.entidadeId, { tipo: 'envio_rejeitado', titulo: `Envio ${s.protocolo} rejeitado`, link });
  if (acao === 'retirar') await notificarEntidade(s.entidadeId, { tipo: 'envio_retirado', titulo: `Envio ${s.protocolo} retirado da base analítica`, link });
  return { status: destino };
}

export async function adicionarComentario(u: UsuarioAtual, id: string, texto: string, visivelEntidade: boolean) {
  exigir(u, 'analise:comentar');
  const s = await obterComAcesso(u, id);
  const t = texto.trim();
  if (t.length < 3 || t.length > 2000) throw new ErroNegocio('O comentário deve ter entre 3 e 2000 caracteres.');
  await db.insert(comentariosTecnicos).values({ submissaoId: id, autorId: u.id, texto: t, visivelEntidade });
  await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: 'analise.comentario', recursoTipo: 'submissao', recursoId: id });
  if (visivelEntidade) await notificarEntidade(s.entidadeId, { tipo: 'comentario', titulo: `Novo comentário no envio ${s.protocolo}`, link: `/entidade/envios/${id}` });
}

export async function adicionarPendencia(u: UsuarioAtual, id: string, p: { linha?: number; campo?: string; descricao: string }) {
  exigir(u, 'analise:comentar');
  const s = await obterComAcesso(u, id);
  if (!p.descricao.trim()) throw new ErroNegocio('Descreva a pendência.');
  await db.insert(pendencias).values({ submissaoId: id, linha: p.linha, campo: p.campo, descricao: p.descricao.trim().slice(0, 500), criadoPor: u.id });
  await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: 'analise.pendencia_criada', recursoTipo: 'submissao', recursoId: id });
}

export async function resolverPendencia(u: UsuarioAtual, pendenciaId: string) {
  exigir(u, 'analise:comentar');
  const [p] = await db.select().from(pendencias).where(eq(pendencias.id, pendenciaId));
  if (!p) throw new ErroNegocio('Pendência não encontrada.');
  await db.update(pendencias).set({ status: 'resolvida', resolvidaEm: new Date() }).where(eq(pendencias.id, pendenciaId));
  await registrar({ usuarioId: u.id, acao: 'analise.pendencia_resolvida', recursoTipo: 'submissao', recursoId: p.submissaoId });
}
