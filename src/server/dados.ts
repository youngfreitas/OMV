import 'server-only';
import { and, desc, eq, inArray, like, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bairros, entidades, regioes, registrosAprovados } from '@/lib/db/schema';
import { exigir } from '@/lib/auth/guards';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { DOMINIOS_PADRAO } from '@/lib/dicionario/dominios';
import { MENSAGEM_INDISPONIVEL } from '@/lib/publicacao/motor';
import type { Indicador } from '@/lib/publicacao/tipos';
import { carregarDominios, configuracao } from '@/server/cadastros';
import { calcularSobreBaseAnalitica } from '@/server/publicacao';
import { carregarFonte } from '@/server/fonte';
import { fmtMes } from '@/lib/formato';

export type Celula = { codigo: string; rotulo: string; valor: number | null; suprimido: boolean };
export type Filtros = {
  unidade?: string;
  periodo?: string; // YYYY-MM | YYYY | todos
  entidadeId?: string;
  regiaoId?: string;
  bairroId?: string;
  categoria?: string;
  faixa?: string;
  tipo?: string;
};

export type PainelDados = {
  restrito: boolean; // true = regras de supressão aplicadas
  disponivel: boolean;
  mensagem?: string;
  unidade: string;
  unidades: Array<{ codigo: string; rotulo: string }>;
  periodo: string;
  periodos: string[];
  periodoRotulo: string;
  total: { valor: number | null; suprimido: boolean };
  serie: Array<{ periodo: string; rotulo: string; valor: number | null; suprimido: boolean }>;
  porCategoria: Celula[];
  porFaixa: Celula[];
  porTipo: Celula[];
  porTerritorio: Array<Celula & { tipo: 'regiao' | 'bairro' }>;
  comparacao: { anteriorRotulo: string; anterior: number | null; variacaoPct: number | null; alerta?: string } | null;
  cobertura: { entidades: number; entidadesAnterior: number | null };
  notas: string[];
};

const rotuloPeriodo = (p: string) => (p === 'todos' ? 'Todo o período' : /^\d{4}$/.test(p) ? `Ano de ${p}` : fmtMes(p));

function periodoAnterior(p: string): string | null {
  if (p === 'todos') return null;
  if (/^\d{4}$/.test(p)) return String(Number(p) - 1);
  const [a, m] = p.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function alertaComparacao(atual: number | null, anterior: number | null, k: number, entidadesAtual: number, entidadesAnt: number | null, rotAnt: string) {
  const pct = await configuracao<number>('validacao.variacao_alerta_pct', 60);
  if (atual === null || anterior === null || anterior < k) return { variacaoPct: null as number | null };
  const v = (atual - anterior) / anterior;
  let alerta: string | undefined;
  if (Math.abs(v) * 100 >= pct) {
    const sentido = v > 0 ? 'Aumento' : 'Redução';
    alerta = `${sentido} de ${Math.abs(Math.round(v * 100))}% em relação a ${rotAnt}. A variação descreve os registros recebidos e pode refletir mudanças na cobertura de envios (${entidadesAtual} entidade(s) enviaram dados neste período; ${entidadesAnt ?? '—'} no anterior). Ela não indica, por si só, mudança na ocorrência de violência.`;
  }
  return { variacaoPct: v * 100, alerta };
}

export async function painelDados(u: UsuarioAtual, f: Filtros): Promise<PainelDados> {
  exigir(u, 'dados:ver_agregado');
  const irrestrito = u.permissoes.has('dados:ver_nao_suprimido');
  const fonte = await carregarFonte();
  const dominios = fonte.dominios;
  const rot = (dom: string, cod: string) => dominios[dom]?.find((i) => i.codigo === cod)?.rotulo ?? cod;
  const k = await configuracao<number>('supressao.k', 5);
  const domCat = dominios.categoria_violencia ?? [];
  const domFaixa = dominios.faixa_etaria ?? [];
  const domTipo = dominios.tipo_registro ?? [];
  const todasUnidades = (dominios.unidade_contagem ?? DOMINIOS_PADRAO.unidade_contagem).map((x) => ({ codigo: x.codigo, rotulo: x.rotulo }));
  const unidadesComDados = todasUnidades.filter((x) => fonte.registros.some((r) => r.unidade === x.codigo));
  const unidade = f.unidade && unidadesComDados.some((x) => x.codigo === f.unidade) ? f.unidade : (unidadesComDados[0]?.codigo ?? 'atendimento');
  const vazio = (mensagem?: string): PainelDados => ({
    restrito: !irrestrito, disponivel: false, mensagem, unidade, unidades: unidadesComDados.length ? unidadesComDados : todasUnidades, periodo: 'todos', periodos: [], periodoRotulo: '',
    total: { valor: null, suprimido: false }, serie: [], porCategoria: [], porFaixa: [], porTipo: [], porTerritorio: [], comparacao: null, cobertura: { entidades: 0, entidadesAnterior: null }, notas: [],
  });
  if (fonte.registros.length === 0) return vazio('Ainda não há registros aprovados.');

  const daUnidade = fonte.registros.filter((r) => r.unidade === unidade);
  const meses = [...new Set(daUnidade.map((r) => r.periodo))].sort();
  const anos = [...new Set(meses.map((m) => m.slice(0, 4)))];
  const periodos = ['todos', ...anos.slice().reverse(), ...meses.slice().reverse()];
  const periodo = f.periodo && periodos.includes(f.periodo) ? f.periodo : 'todos';
  const naoPeriodo = (r: (typeof fonte.registros)[number]) =>
    (!f.entidadeId || r.entidadeId === f.entidadeId) &&
    (!f.regiaoId || r.regiaoId === f.regiaoId) &&
    (!f.bairroId || r.bairroId === f.bairroId) &&
    (!f.categoria || r.categoria === f.categoria) &&
    (!f.faixa || r.faixa === f.faixa) &&
    (!f.tipo || r.tipoRegistro === f.tipo);
  const noPeriodo = (p: string) => (r: { periodo: string }) => p === 'todos' || (/^\d{4}$/.test(p) ? r.periodo.startsWith(`${p}-`) : r.periodo === p);
  const nomeDe = (id: string) => fonte.nomes.get(id) ?? id;
  const ant = periodoAnterior(periodo);

  if (!irrestrito) {
    const extras = [f.entidadeId, f.regiaoId, f.bairroId, f.categoria, f.faixa, f.tipo].filter(Boolean);
    const base = { unidades: unidadesComDados, periodos, periodo, unidade };
    if (extras.length) return { ...vazio(MENSAGEM_INDISPONIVEL), ...base };
    const { indicadores, relatorio } = await calcularSobreBaseAnalitica(fonte);
    const ind = indicadores.filter((i) => i.unidade === unidade);
    const pega = (p: string, fn: (i: Indicador) => boolean) => ind.filter((i) => i.periodo === p && fn(i));
    const dim = (pref: string, lista: Array<{ codigo: string; rotulo: string }>, dom: string): Celula[] =>
      lista.map((d) => {
        const i = pega(periodo, (x) => x.dimensao === `${pref}:${d.codigo}`)[0];
        return { codigo: d.codigo, rotulo: rot(dom, d.codigo), valor: i?.valor ?? 0, suprimido: i?.suprimido ?? false };
      });
    const totalI = pega(periodo, (x) => x.cubo === 'total')[0];
    const antI = ant ? pega(ant, (x) => x.cubo === 'total')[0] : undefined;
    const entAtual = new Set(daUnidade.filter(noPeriodo(periodo)).map((r) => r.entidadeId)).size;
    const entAnt = ant ? new Set(daUnidade.filter(noPeriodo(ant)).map((r) => r.entidadeId)).size : null;
    const cmp = ant ? await alertaComparacao(totalI?.valor ?? null, antI?.valor ?? null, k, entAtual, entAnt, rotuloPeriodo(ant)) : null;
    return {
      restrito: true, disponivel: true, unidade, unidades: unidadesComDados, periodo, periodos, periodoRotulo: rotuloPeriodo(periodo),
      total: { valor: totalI?.valor ?? 0, suprimido: totalI?.suprimido ?? false },
      serie: meses.map((m) => {
        const i = pega(m, (x) => x.cubo === 'total')[0];
        return { periodo: m, rotulo: fmtMes(m), valor: i?.valor ?? 0, suprimido: i?.suprimido ?? false };
      }),
      porCategoria: dim('categoria', domCat, 'categoria_violencia'),
      porFaixa: dim('faixa', domFaixa, 'faixa_etaria'),
      porTipo: dim('tipo', domTipo, 'tipo_registro'),
      porTerritorio: pega(periodo, (x) => x.cubo === 'territorio').map((i) => ({ tipo: i.territorioTipo as 'regiao' | 'bairro', codigo: i.territorioId, rotulo: nomeDe(i.territorioId), valor: i.valor, suprimido: i.suprimido })),
      comparacao: ant && cmp ? { anteriorRotulo: rotuloPeriodo(ant), anterior: antI?.valor ?? null, variacaoPct: cmp.variacaoPct, alerta: cmp.alerta } : null,
      cobertura: { entidades: entAtual, entidadesAnterior: entAnt },
      notas: [`Valores menores que ${relatorio.k} são suprimidos; supressões complementares evitam recálculo por diferença.`, 'Registros, atendimentos e pessoas atendidas são medidas distintas e nunca são somadas.'],
    };
  }

  // Acesso irrestrito: agregação direta (sem supressão), com filtros livres. Uso interno.
  const filtrados = daUnidade.filter(naoPeriodo);
  const atuais = filtrados.filter(noPeriodo(periodo));
  const soma = (rs: typeof atuais) => rs.reduce((s, r) => s + r.quantidade, 0);
  const por = (rs: typeof atuais, chave: (r: (typeof atuais)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const r of rs) {
      const c = chave(r);
      if (c) m.set(c, (m.get(c) ?? 0) + r.quantidade);
    }
    return m;
  };
  const celulas = (m: Map<string, number>, lista: Array<{ codigo: string; rotulo: string }>): Celula[] =>
    lista.map((d) => ({ codigo: d.codigo, rotulo: d.rotulo, valor: m.get(d.codigo) ?? 0, suprimido: false }));
  const regMap = por(atuais, (r) => r.regiaoId);
  const baiMap = por(atuais, (r) => r.bairroId);
  const valAnt = ant ? soma(filtrados.filter(noPeriodo(ant))) : null;
  const entAtual = new Set(atuais.map((r) => r.entidadeId)).size;
  const entAnt = ant ? new Set(filtrados.filter(noPeriodo(ant)).map((r) => r.entidadeId)).size : null;
  const total = soma(atuais);
  const cmp = ant ? await alertaComparacao(total, valAnt, k, entAtual, entAnt, rotuloPeriodo(ant)) : null;
  return {
    restrito: false, disponivel: true, unidade, unidades: unidadesComDados, periodo, periodos, periodoRotulo: rotuloPeriodo(periodo),
    total: { valor: total, suprimido: false },
    serie: meses.map((m) => ({ periodo: m, rotulo: fmtMes(m), valor: soma(filtrados.filter((r) => r.periodo === m)), suprimido: false })),
    porCategoria: celulas(por(atuais, (r) => r.categoria), domCat),
    porFaixa: celulas(por(atuais, (r) => r.faixa), domFaixa),
    porTipo: celulas(por(atuais, (r) => r.tipoRegistro), domTipo),
    porTerritorio: [
      ...[...regMap].map(([id, v]) => ({ tipo: 'regiao' as const, codigo: id, rotulo: nomeDe(id), valor: v, suprimido: false })),
      ...[...baiMap].map(([id, v]) => ({ tipo: 'bairro' as const, codigo: id, rotulo: nomeDe(id), valor: v, suprimido: false })),
    ],
    comparacao: ant && cmp ? { anteriorRotulo: rotuloPeriodo(ant), anterior: valAnt, variacaoPct: cmp.variacaoPct, alerta: cmp.alerta } : null,
    cobertura: { entidades: entAtual, entidadesAnterior: entAnt },
    notas: ['Dados internos SEM supressão: não divulgar nem reproduzir fora do ambiente interno.', 'Registros, atendimentos e pessoas atendidas são medidas distintas e nunca são somadas.'],
  };
}

export async function opcoesFiltros(u: UsuarioAtual) {
  exigir(u, 'dados:ver_agregado');
  const f = await carregarFonte();
  const nome = (id: string) => f.nomes.get(id) ?? id;
  const ord = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'pt-BR');
  return {
    entidades: f.entidades.map((e) => ({ value: e.id, label: e.nome })).sort(ord),
    regioes: f.territorio.regioes.map((r) => ({ value: r.id, label: nome(r.id) })).sort(ord),
    bairros: f.territorio.bairros.map((b) => ({ value: b.id, label: nome(b.id) })).sort(ord),
    dominios: f.dominios,
  };
}

/* ───────── Monitoramento ───────── */

export type FiltrosMonitor = {
  busca?: string;
  periodo?: string;
  entidadeId?: string;
  unidade?: string;
  categoria?: string;
  faixa?: string;
  situacao?: 'ativos' | 'retirados' | 'todos';
  ordem?: string;
  dir?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
};

const ORDENAVEIS = {
  periodo: registrosAprovados.periodo,
  quantidade: registrosAprovados.quantidade,
  categoria: registrosAprovados.categoriaViolencia,
  unidade: registrosAprovados.unidadeContagem,
  aprovadoEm: registrosAprovados.aprovadoEm,
} as const;

export async function monitoramento(u: UsuarioAtual, f: FiltrosMonitor) {
  exigir(u, 'monitoramento:ler');
  const irrestrito = u.permissoes.has('dados:ver_nao_suprimido');
  const k = await configuracao<number>('supressao.k', 5);
  const dominios = await carregarDominios();
  const rot = (dom: string, cod?: string | null) => (cod ? (dominios[dom]?.find((i) => i.codigo === cod)?.rotulo ?? cod) : '—');
  const cond: SQL[] = [];
  if (f.situacao === 'retirados') cond.push(eq(registrosAprovados.ativo, false));
  else if (f.situacao !== 'todos') cond.push(eq(registrosAprovados.ativo, true));
  if (f.periodo) cond.push(/^\d{4}$/.test(f.periodo) ? like(registrosAprovados.periodo, `${f.periodo}-%`) : eq(registrosAprovados.periodo, f.periodo));
  if (f.entidadeId) cond.push(eq(registrosAprovados.entidadeId, f.entidadeId));
  if (f.unidade) cond.push(eq(registrosAprovados.unidadeContagem, f.unidade));
  if (f.categoria) cond.push(eq(registrosAprovados.categoriaViolencia, f.categoria));
  if (f.faixa) cond.push(eq(registrosAprovados.faixaEtaria, f.faixa));
  if (f.busca?.trim()) {
    const b = `%${f.busca.trim().replace(/[%_]/g, '')}%`;
    const bs = await db.select({ id: bairros.id }).from(bairros).where(sql`${bairros.nome} ilike ${b}`);
    const es = await db.select({ id: entidades.id }).from(entidades).where(sql`${entidades.nome} ilike ${b}`);
    const cats = (dominios.categoria_violencia ?? []).filter((c) => c.rotulo.toLowerCase().includes(f.busca!.trim().toLowerCase())).map((c) => c.codigo);
    const ors: SQL[] = [sql`${registrosAprovados.periodo} ilike ${b}`];
    if (bs.length) ors.push(inArray(registrosAprovados.bairroId, bs.map((x) => x.id)));
    if (es.length) ors.push(inArray(registrosAprovados.entidadeId, es.map((x) => x.id)));
    if (cats.length) ors.push(inArray(registrosAprovados.categoriaViolencia, cats));
    cond.push(sql`(${sql.join(ors, sql` or `)})`);
  }
  const porPagina = [25, 50, 100].includes(f.porPagina ?? 0) ? f.porPagina! : 25;
  const pagina = Math.max(1, f.pagina ?? 1);
  const col = ORDENAVEIS[(f.ordem as keyof typeof ORDENAVEIS) ?? 'periodo'] ?? registrosAprovados.periodo;
  const ord = f.dir === 'asc' ? col : desc(col);
  const where = cond.length ? and(...cond) : undefined;
  const [linhas, [tot]] = await Promise.all([
    db
      .select({
        id: registrosAprovados.id,
        periodo: registrosAprovados.periodo,
        entidade: entidades.nome,
        bairro: bairros.nome,
        regiao: regioes.nome,
        tipoRegistro: registrosAprovados.tipoRegistro,
        unidade: registrosAprovados.unidadeContagem,
        categoria: registrosAprovados.categoriaViolencia,
        faixa: registrosAprovados.faixaEtaria,
        quantidade: registrosAprovados.quantidade,
        ativo: registrosAprovados.ativo,
        submissaoId: registrosAprovados.submissaoId,
      })
      .from(registrosAprovados)
      .innerJoin(entidades, eq(entidades.id, registrosAprovados.entidadeId))
      .leftJoin(bairros, eq(bairros.id, registrosAprovados.bairroId))
      .leftJoin(regioes, eq(regioes.id, registrosAprovados.regiaoId))
      .where(where)
      .orderBy(ord, registrosAprovados.id)
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    db.select({ n: sql<number>`count(*)::int` }).from(registrosAprovados).where(where),
  ]);
  return {
    k,
    irrestrito,
    total: tot?.n ?? 0,
    pagina,
    porPagina,
    linhas: linhas.map((l) => ({
      ...l,
      tipoRegistroRotulo: rot('tipo_registro', l.tipoRegistro),
      unidadeRotulo: rot('unidade_contagem', l.unidade),
      categoriaRotulo: rot('categoria_violencia', l.categoria),
      faixaRotulo: rot('faixa_etaria', l.faixa),
      // Sem permissão de ver não suprimido, contagens pequenas não são exibidas na linha.
      quantidade: irrestrito || l.quantidade >= k || l.quantidade === 0 ? l.quantidade : null,
    })),
  };
}
