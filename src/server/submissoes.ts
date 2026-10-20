import 'server-only';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  arquivosRecebidos,
  comentariosTecnicos,
  decisoesAnalise,
  entidades,
  pendencias,
  registrosAprovados,
  registrosRecebidos,
  submissaoVersoes,
  submissoes,
} from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { cifrar, cifrarBuffer, decifrar, sha256Hex } from '@/lib/auth/cripto';
import { ErroAcesso, ErroNegocio } from '@/lib/auth/erros';
import { escopoSubmissoes, exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { ID_MODELO, VERSAO_MODELO, type LinhaBruta } from '@/lib/dicionario/campos';
import { hashLinha } from '@/lib/validacao/duplicidade-hash';
import { mesDe } from '@/lib/validacao/normalizar';
import { podeEnviar, validarEnvio } from '@/lib/validacao/regras';
import type { ContextoValidacao, RelatorioValidacao } from '@/lib/validacao/tipos';
import { editavel, type Status } from '@/lib/fluxo/maquina';
import { notificarPorPermissao } from '@/server/notificacoes';
import { carregarBairros, carregarDominios, configuracao } from '@/server/cadastros';

export type Payload = { cabecalho: LinhaBruta; linhas: LinhaBruta[] };
export const REMOVIDO = '[removido: possível dado pessoal]';

const STATUS_COM_DADOS_VALIDOS: Status[] = ['enviado', 'aguardando_analise', 'em_analise', 'pendente_correcao', 'reenviado', 'aprovado'];

export async function montarContexto(entidadeId: string, excluir?: string): Promise<ContextoValidacao> {
  const [dominios, bairros, variacaoPct] = await Promise.all([
    carregarDominios(),
    carregarBairros(),
    configuracao<number>('validacao.variacao_alerta_pct', 60),
  ]);
  const existentes = await db
    .select({ h: registrosRecebidos.hashLinha })
    .from(registrosRecebidos)
    .innerJoin(
      submissoes,
      and(eq(submissoes.id, registrosRecebidos.submissaoId), eq(submissoes.versaoAtual, registrosRecebidos.versaoNumero)),
    )
    .where(
      and(
        eq(submissoes.entidadeId, entidadeId),
        inArray(submissoes.status, STATUS_COM_DADOS_VALIDOS),
        excluir ? ne(submissoes.id, excluir) : undefined,
      ),
    );
  const hist = await db
    .select({
      unidade: registrosAprovados.unidadeContagem,
      media: sql<number>`sum(${registrosAprovados.quantidade})::float / count(distinct ${registrosAprovados.periodo})`,
    })
    .from(registrosAprovados)
    .where(and(eq(registrosAprovados.entidadeId, entidadeId), eq(registrosAprovados.ativo, true)))
    .groupBy(registrosAprovados.unidadeContagem);
  return {
    dominios,
    bairros,
    hoje: new Date(),
    variacaoPct,
    mediasHistoricas: Object.fromEntries(hist.map((h) => [h.unidade, Number(h.media)])),
    hashesExistentes: new Set(existentes.map((e) => e.h)),
    entidadeId,
    hashearLinha: (l) => hashLinha(entidadeId, l),
  };
}

function entidadeDoUsuario(u: UsuarioAtual): string {
  if (!u.entidadeId) throw new ErroAcesso(403, 'Seu usuário não está vinculado a uma entidade.');
  return u.entidadeId;
}

async function obterComAcesso(u: UsuarioAtual, id: string) {
  const [s] = await db.select().from(submissoes).where(eq(submissoes.id, id));
  if (!s) throw new ErroNegocio('Envio não encontrado.', 'nao_encontrado');
  const esc = escopoSubmissoes(u);
  // Mesma resposta para inexistente e de outra entidade: não revela existência.
  if (esc.tipo === 'entidade' && s.entidadeId !== esc.entidadeId) throw new ErroNegocio('Envio não encontrado.', 'nao_encontrado');
  return s;
}

export { obterComAcesso };

function protocoloDe(seq: number): string {
  return `OMV-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`;
}

export async function salvarRascunho(
  u: UsuarioAtual,
  entrada: {
    id?: string;
    cabecalho: LinhaBruta;
    linhas: LinhaBruta[];
    tipoEntrada?: 'formulario' | 'csv' | 'xlsx' | 'docx' | 'md';
    arquivo?: { nome: string; mime: string; buffer: Buffer };
    versaoModeloArquivo?: string;
  },
): Promise<{ id: string; relatorio: RelatorioValidacao }> {
  exigir(u, 'submissao:criar', 'submissao:importar');
  const entidadeId = entidadeDoUsuario(u);
  let sub = entrada.id ? await obterComAcesso(u, entrada.id) : null;
  if (sub && sub.entidadeId !== entidadeId) throw new ErroAcesso(403, 'Envio de outra entidade.');
  if (sub && !editavel(sub.status as Status)) throw new ErroNegocio('Este envio não pode mais ser editado.', 'nao_editavel');

  const ctx = await montarContexto(entidadeId, sub?.id);
  const { linhas, relatorio } = validarEnvio({ cabecalho: entrada.cabecalho, linhas: entrada.linhas }, ctx);
  const restrita = relatorio.restrita;

  // Redação: células com possível dado pessoal nunca são gravadas em claro nas tabelas de trabalho.
  const redigir = (bruta: LinhaBruta, linha: number): LinhaBruta => {
    const r = { ...bruta };
    for (const c of relatorio.celulasPii) if (c.linha === linha && c.campo in r) r[c.campo] = REMOVIDO;
    return r;
  };
  const cabecalhoRedigido = { ...entrada.cabecalho };
  for (const c of relatorio.celulasPii) if (c.linha === null && c.campo in cabecalhoRedigido) cabecalhoRedigido[c.campo] = REMOVIDO;
  const brutasNaoVazias = entrada.linhas.filter((r) => Object.values(r).some((v) => (v ?? '').toString().trim() !== ''));
  const payloadClaro: Payload = { cabecalho: entrada.cabecalho, linhas: entrada.linhas };
  const payload = restrita ? { cifrado: cifrar(JSON.stringify(payloadClaro)) } : payloadClaro;

  const unidades = new Set(linhas.filter((l) => !l.invalida).map((l) => l.unidade_contagem));
  const meses = new Set(linhas.filter((l) => !l.invalida).map((l) => mesDe(l.periodo_inicio)));
  const valoresSub = {
    periodoInicio: relatorio.resumo.periodoInicio,
    periodoFim: relatorio.resumo.periodoFim,
    tipoEntrada: entrada.tipoEntrada ?? 'formulario',
    versaoModelo: entrada.versaoModeloArquivo ?? VERSAO_MODELO,
    unidadeAnalise: unidades.size === 1 ? [...unidades][0]! : unidades.size > 1 ? 'mista' : null,
    consolidacao: meses.size > 1 ? 'multiplos_meses' : 'mensal',
    restrita,
    observacaoGeral: restrita && relatorio.celulasPii.some((c) => c.campo === 'observacao_geral') ? null : (entrada.cabecalho.observacao_geral ?? null),
    hashConteudo: sha256Hex(JSON.stringify(payloadClaro)),
    atualizadoEm: new Date(),
  };

  return db.transaction(async (tx) => {
    let numeroVersao: number;
    if (!sub) {
      const [novo] = await tx
        .insert(submissoes)
        .values({ entidadeId, criadoPor: u.id, status: 'rascunho', ...valoresSub })
        .returning();
      sub = novo!;
      numeroVersao = 1;
    } else if (sub.status === 'pendente_correcao') {
      // Primeira edição após a devolução cria nova versão; as seguintes atualizam a mesma.
      const [dev] = await tx
        .select({ em: decisoesAnalise.criadoEm })
        .from(decisoesAnalise)
        .where(and(eq(decisoesAnalise.submissaoId, sub.id), eq(decisoesAnalise.acao, 'devolver')))
        .orderBy(desc(decisoesAnalise.criadoEm))
        .limit(1);
      const [ultima] = await tx
        .select({ em: submissaoVersoes.criadoEm })
        .from(submissaoVersoes)
        .where(and(eq(submissaoVersoes.submissaoId, sub.id), eq(submissaoVersoes.numero, sub.versaoAtual)));
      const emCorrecao = dev && ultima && ultima.em > dev.em;
      numeroVersao = emCorrecao ? sub.versaoAtual : sub.versaoAtual + 1;
      await tx.update(submissoes).set({ ...valoresSub, versaoAtual: numeroVersao }).where(eq(submissoes.id, sub.id));
    } else {
      numeroVersao = sub.versaoAtual;
      await tx.update(submissoes).set(valoresSub).where(eq(submissoes.id, sub.id));
    }
    await tx.delete(submissaoVersoes).where(and(eq(submissaoVersoes.submissaoId, sub.id), eq(submissaoVersoes.numero, numeroVersao)));
    await tx.insert(submissaoVersoes).values({
      submissaoId: sub.id,
      numero: numeroVersao,
      payload: payload as never,
      relatorioValidacao: relatorio as never,
      criadoPor: u.id,
    });
    await tx.delete(registrosRecebidos).where(and(eq(registrosRecebidos.submissaoId, sub.id), eq(registrosRecebidos.versaoNumero, numeroVersao)));
    if (linhas.length) {
      await tx.insert(registrosRecebidos).values(
        linhas.map((l, i) => {
          const norm = restrita ? { ...l, observacao: l.observacao && relatorio.celulasPii.some((c) => c.linha === l.linha && c.campo === 'observacao') ? REMOVIDO : l.observacao } : l;
          const alertasLinha = relatorio.achados.filter((a) => a.linha === l.linha);
          return {
            submissaoId: sub!.id,
            versaoNumero: numeroVersao,
            linha: l.linha,
            dados: { bruta: redigir(brutasNaoVazias[i] ?? {}, l.linha), normalizada: norm } as never,
            hashLinha: l.invalida ? sha256Hex(JSON.stringify(brutasNaoVazias[i] ?? {})) : hashLinha(entidadeId, l),
            statusValidacao: alertasLinha.some((a) => a.nivel === 'erro') ? 'erro' : alertasLinha.length ? 'alerta' : 'ok',
            alertas: alertasLinha as never,
          };
        }),
      );
    }
    void cabecalhoRedigido;
    if (entrada.arquivo) {
      const dias = await configuracao<number>('retencao.arquivos_dias', 30);
      await tx.insert(arquivosRecebidos).values({
        submissaoId: sub.id,
        nomeOriginal: entrada.arquivo.nome,
        mime: entrada.arquivo.mime,
        tamanho: entrada.arquivo.buffer.length,
        sha256: sha256Hex(entrada.arquivo.buffer),
        conteudoCifrado: cifrarBuffer(entrada.arquivo.buffer),
        expiraEm: new Date(Date.now() + dias * 86_400_000),
      });
    }
    await registrar(
      {
        usuarioId: u.id,
        entidadeId,
        acao: entrada.id ? 'submissao.rascunho_salvo' : 'submissao.rascunho_criado',
        recursoTipo: 'submissao',
        recursoId: sub.id,
        detalhes: { linhas: linhas.length, restrita, tipoEntrada: valoresSub.tipoEntrada },
      },
      tx,
    );
    return { id: sub.id, relatorio };
  });
}

export async function enviarSubmissao(u: UsuarioAtual, id: string, opcoes: { declaracao: boolean }) {
  exigir(u, 'submissao:criar');
  const s = await obterComAcesso(u, id);
  if (s.status !== 'rascunho') {
    if (s.enviadoPor === u.id && s.protocolo) return { protocolo: s.protocolo, jaEnviado: true };
    throw new ErroNegocio('Este envio não está em rascunho.', 'estado_invalido');
  }
  if (!opcoes.declaracao) throw new ErroNegocio('Confirme a declaração de ausência de dados pessoais para enviar.', 'declaracao');
  const [ver] = await db
    .select()
    .from(submissaoVersoes)
    .where(and(eq(submissaoVersoes.submissaoId, id), eq(submissaoVersoes.numero, s.versaoAtual)));
  const rel = ver?.relatorioValidacao as RelatorioValidacao | null;
  if (!rel || !podeEnviar(rel)) throw new ErroNegocio('Corrija os erros apontados na validação antes de enviar.', 'validacao');

  const [{ seq }] = (await db.execute(sql`select nextval('protocolo_seq')::int as seq`)) as unknown as [{ seq: number }];
  const protocolo = protocoloDe(seq);
  await db.transaction(async (tx) => {
    await tx
      .update(submissoes)
      .set({ status: 'aguardando_analise', protocolo, enviadoPor: u.id, enviadoEm: new Date(), atualizadoEm: new Date(), chaveIdempotencia: `${u.id}:${id}` })
      .where(eq(submissoes.id, id));
    await tx.insert(decisoesAnalise).values({ submissaoId: id, acao: 'enviar', deStatus: 'rascunho', paraStatus: 'aguardando_analise', usuarioId: u.id });
    await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: 'submissao.enviada', recursoTipo: 'submissao', recursoId: id, detalhes: { protocolo, restrita: s.restrita } }, tx);
  });
  // Notificação só com protocolo/status — nunca conteúdo.
  await notificarPorPermissao('analise:aprovar', {
    tipo: 'envio_recebido',
    titulo: `Novo envio recebido (${protocolo})`,
    texto: s.restrita ? 'Marcado como restrito: possível dado pessoal.' : undefined,
    link: `/analise/${id}`,
  });
  return { protocolo, jaEnviado: false };
}

export async function reenviarSubmissao(u: UsuarioAtual, id: string, opcoes: { declaracao: boolean }) {
  exigir(u, 'submissao:criar');
  const s = await obterComAcesso(u, id);
  if (s.status !== 'pendente_correcao') throw new ErroNegocio('Este envio não está aguardando correção.', 'estado_invalido');
  if (!opcoes.declaracao) throw new ErroNegocio('Confirme a declaração de ausência de dados pessoais para reenviar.', 'declaracao');
  const [ver] = await db
    .select()
    .from(submissaoVersoes)
    .where(and(eq(submissaoVersoes.submissaoId, id), eq(submissaoVersoes.numero, s.versaoAtual)));
  const rel = ver?.relatorioValidacao as RelatorioValidacao | null;
  const [dev] = await db
    .select({ em: decisoesAnalise.criadoEm })
    .from(decisoesAnalise)
    .where(and(eq(decisoesAnalise.submissaoId, id), eq(decisoesAnalise.acao, 'devolver')))
    .orderBy(desc(decisoesAnalise.criadoEm))
    .limit(1);
  if (!rel || !ver || (dev && ver.criadoEm <= dev.em)) throw new ErroNegocio('Faça as correções e salve antes de reenviar.', 'sem_correcao');
  if (!podeEnviar(rel)) throw new ErroNegocio('Corrija os erros apontados na validação antes de reenviar.', 'validacao');
  await db.transaction(async (tx) => {
    await tx.update(submissoes).set({ status: 'reenviado', enviadoEm: new Date(), atualizadoEm: new Date() }).where(eq(submissoes.id, id));
    await tx.update(pendencias).set({ status: 'resolvida', resolvidaEm: new Date() }).where(and(eq(pendencias.submissaoId, id), eq(pendencias.status, 'aberta')));
    await tx.insert(decisoesAnalise).values({ submissaoId: id, acao: 'reenviar', deStatus: 'pendente_correcao', paraStatus: 'reenviado', usuarioId: u.id });
    await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: 'submissao.reenviada', recursoTipo: 'submissao', recursoId: id }, tx);
  });
  await notificarPorPermissao('analise:aprovar', { tipo: 'envio_reenviado', titulo: `Envio reenviado (${s.protocolo})`, link: `/analise/${id}` });
  return { protocolo: s.protocolo! };
}

export async function descartarRascunho(u: UsuarioAtual, id: string) {
  exigir(u, 'submissao:criar');
  const s = await obterComAcesso(u, id);
  if (s.status !== 'rascunho') throw new ErroNegocio('Só rascunhos podem ser descartados.', 'estado_invalido');
  await db.delete(submissoes).where(eq(submissoes.id, id));
  await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: 'submissao.rascunho_descartado', recursoTipo: 'submissao', recursoId: id });
}

export async function listarSubmissoes(u: UsuarioAtual, filtros: { status?: string } = {}) {
  const esc = escopoSubmissoes(u);
  const cond = [];
  if (esc.tipo === 'entidade') cond.push(eq(submissoes.entidadeId, esc.entidadeId));
  if (filtros.status) cond.push(eq(submissoes.status, filtros.status));
  return db
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
      atualizadoEm: submissoes.atualizadoEm,
    })
    .from(submissoes)
    .innerJoin(entidades, eq(entidades.id, submissoes.entidadeId))
    .where(cond.length ? and(...cond) : undefined)
    .orderBy(desc(submissoes.atualizadoEm))
    .limit(500);
}

/** Detalhe seguro: nunca devolve conteúdo cifrado nem células redigidas. */
export async function detalheSubmissao(u: UsuarioAtual, id: string) {
  const s = await obterComAcesso(u, id);
  const [ver] = await db
    .select()
    .from(submissaoVersoes)
    .where(and(eq(submissaoVersoes.submissaoId, id), eq(submissaoVersoes.numero, s.versaoAtual)));
  const linhas = await db
    .select()
    .from(registrosRecebidos)
    .where(and(eq(registrosRecebidos.submissaoId, id), eq(registrosRecebidos.versaoNumero, s.versaoAtual)))
    .orderBy(registrosRecebidos.linha);
  const [decisoes, pend, coment, [ent]] = await Promise.all([
    db.select().from(decisoesAnalise).where(eq(decisoesAnalise.submissaoId, id)).orderBy(decisoesAnalise.criadoEm),
    db.select().from(pendencias).where(eq(pendencias.submissaoId, id)).orderBy(pendencias.criadoEm),
    db.select().from(comentariosTecnicos).where(eq(comentariosTecnicos.submissaoId, id)).orderBy(comentariosTecnicos.criadoEm),
    db.select().from(entidades).where(eq(entidades.id, s.entidadeId)),
  ]);
  const ehEntidade = !u.permissoes.has('analise:ler');
  return {
    submissao: s,
    entidade: ent!,
    relatorio: (ver?.relatorioValidacao ?? null) as RelatorioValidacao | null,
    linhas: linhas.map((l) => ({ ...l, dados: l.dados as { bruta: LinhaBruta; normalizada: Record<string, unknown> } })),
    decisoes: ehEntidade ? decisoes.filter((d) => d.acao !== 'iniciar_analise') : decisoes,
    pendencias: pend,
    comentarios: ehEntidade ? coment.filter((c) => c.visivelEntidade) : coment,
    modelo: { id: ID_MODELO, versao: s.versaoModelo },
  };
}

/** Conteúdo original de envio restrito: exige permissão específica e é auditado. */
export async function lerOriginalRestrito(u: UsuarioAtual, id: string): Promise<Payload> {
  exigir(u, 'analise:dados_restritos');
  const s = await obterComAcesso(u, id);
  const [ver] = await db
    .select()
    .from(submissaoVersoes)
    .where(and(eq(submissaoVersoes.submissaoId, id), eq(submissaoVersoes.numero, s.versaoAtual)));
  const p = ver?.payload as { cifrado?: string } & Partial<Payload>;
  await registrar({ usuarioId: u.id, entidadeId: s.entidadeId, acao: 'submissao.conteudo_restrito_visto', recursoTipo: 'submissao', recursoId: id });
  if (p?.cifrado) return JSON.parse(decifrar(p.cifrado).toString('utf8')) as Payload;
  return { cabecalho: p?.cabecalho ?? {}, linhas: p?.linhas ?? [] };
}

/** Payload editável pela própria entidade (rascunho/correção): devolve conteúdo sem dados redigidos. */
export async function payloadParaEdicao(u: UsuarioAtual, id: string): Promise<Payload> {
  exigir(u, 'submissao:criar');
  const s = await obterComAcesso(u, id);
  if (!editavel(s.status as Status)) throw new ErroNegocio('Este envio não pode mais ser editado.', 'nao_editavel');
  const linhas = await db
    .select()
    .from(registrosRecebidos)
    .where(and(eq(registrosRecebidos.submissaoId, id), eq(registrosRecebidos.versaoNumero, s.versaoAtual)))
    .orderBy(registrosRecebidos.linha);
  return {
    cabecalho: { periodo_inicio: s.periodoInicio ?? '', periodo_fim: s.periodoFim ?? '', observacao_geral: s.observacaoGeral ?? '' },
    linhas: linhas.map((l) => (l.dados as { bruta: LinhaBruta }).bruta),
  };
}
