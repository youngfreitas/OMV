import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bairros, basesGeograficas, indicadoresPublicados, regioes } from '@/lib/db/schema';
import { DOMINIOS_PADRAO, ROTULOS_DOMINIO } from '@/lib/dicionario/dominios';
import { modoDemo } from '@/lib/demo/modo';
import { ID_CELULA_DEMO, registrosDemoAgregaveis, territorioDemo } from '@/lib/demo/dados';
import { CONTORNO_MUNICIPIO, CONTORNO_OFICIAL, FONTE_CONTORNO } from '@/lib/geo/contorno';
import { gerarCelulasDemo } from '@/lib/geo/celulas-demo';
import type { ColecaoGeo } from '@/lib/geo/tipos';
import { MENSAGEM_INDISPONIVEL, calcularIndicadores } from '@/lib/publicacao/motor';
import type { Cubo, Indicador } from '@/lib/publicacao/tipos';
import { carregarDominios } from '@/server/cadastros';
import { ID_MUNICIPIO, parametrosDaPublicacao, publicacaoAtual } from '@/server/publicacao';

export { MENSAGEM_INDISPONIVEL };

export type CelulaPublica = {
  territorioTipo: 'municipio' | 'regiao' | 'bairro';
  codigo: string;
  nome: string;
  dimensao: string;
  rotulo: string;
  valor: number | null;
  suprimido: boolean;
  generalizado?: { codigo: string; nome: string; valor: number | null };
};

export type RespostaIndicadores = {
  modo: 'demo' | 'real' | 'vazio';
  disponivel: boolean;
  mensagem?: string;
  publicacao?: { versao: number | null; publicadaEm: string | null };
  unidades: Array<{ codigo: string; rotulo: string }>;
  periodos: string[];
  cubo?: Cubo;
  unidade?: string;
  periodo?: string;
  celulas: CelulaPublica[];
  notas: string[];
};

const CUBOS: Cubo[] = ['total', 'territorio', 'categoria', 'faixa', 'tipo'];
const NOTAS = [
  'Os valores são agregados e protegidos: números pequenos são suprimidos e valores que permitiriam recálculo por diferença também.',
  'Registros, atendimentos e pessoas atendidas (únicas) são medidas distintas e nunca são somadas.',
  'Os parâmetros de proteção são provisórios e aguardam validação institucional.',
];

type NomesTerr = Map<string, { nome: string; tipo: 'bairro' | 'regiao' }>;

/** Fonte demonstrativa: fixtures fictícias passam pelo mesmo motor de supressão. */
let demoCache: { indicadores: Indicador[]; nomes: NomesTerr } | null = null;
async function fonteDemo() {
  if (demoCache) return demoCache;
  const n = gerarCelulasDemo(CONTORNO_MUNICIPIO).features.length;
  const t = territorioDemo(n);
  const params = await parametrosDaPublicacao();
  const dom = {
    categoria: DOMINIOS_PADRAO.categoria_violencia.map((i) => i.codigo),
    faixa: DOMINIOS_PADRAO.faixa_etaria.map((i) => i.codigo),
    tipo: DOMINIOS_PADRAO.tipo_registro.map((i) => i.codigo),
  };
  const { indicadores } = calcularIndicadores(registrosDemoAgregaveis(n), t.cfg, dom, { k: params.k, complementar: params.complementar });
  demoCache = { indicadores, nomes: t.nomes };
  return demoCache;
}

function rotuloDimensao(dimensao: string, dominios: Record<string, Array<{ codigo: string; rotulo: string }>>): string {
  if (!dimensao) return '';
  const [pref, cod] = dimensao.split(':') as [string, string];
  const dom = { categoria: 'categoria_violencia', faixa: 'faixa_etaria', tipo: 'tipo_registro' }[pref] ?? pref;
  return dominios[dom]?.find((i) => i.codigo === cod)?.rotulo ?? cod;
}

async function consultarIndicadoresPublicosInterno(q: {
  cubo?: string;
  unidade?: string;
  periodo?: string;
  filtros?: string[]; // dimensões adicionais solicitadas (para checar combinações)
}): Promise<RespostaIndicadores> {
  // Publicação real sempre tem precedência; a fonte fictícia só é usada no modo demonstração e sem publicação.
  const pubReal = await publicacaoAtual();
  const demo = modoDemo() && !pubReal;
  const vazio = (mensagem?: string): RespostaIndicadores => ({ modo: demo ? 'demo' : 'vazio', disponivel: false, mensagem, unidades: [], periodos: [], celulas: [], notas: NOTAS });

  let indicadores: Indicador[];
  let nomes: NomesTerr;
  let publicacao: RespostaIndicadores['publicacao'];
  const dominios = demo ? (DOMINIOS_PADRAO as never as Record<string, Array<{ codigo: string; rotulo: string }>>) : await carregarDominios();

  if (demo) {
    const f = await fonteDemo();
    indicadores = f.indicadores;
    nomes = f.nomes;
    publicacao = { versao: null, publicadaEm: null };
  } else {
    const pub = pubReal;
    if (!pub) return vazio('Ainda não há indicadores publicados.');
    const linhas = await db.select().from(indicadoresPublicados).where(eq(indicadoresPublicados.publicacaoId, pub.id));
    indicadores = linhas.map((l) => ({ cubo: l.cubo as Cubo, periodo: l.periodo, unidade: l.unidade, territorioTipo: l.territorioTipo as Indicador['territorioTipo'], territorioId: l.territorioId, dimensao: l.dimensao, valor: l.valor, suprimido: l.suprimido, motivo: l.motivo as Indicador['motivo'] }));
    const [bs, rs] = await Promise.all([db.select().from(bairros), db.select().from(regioes)]);
    nomes = new Map();
    for (const b of bs) nomes.set(b.id, { nome: b.nome, tipo: 'bairro' });
    for (const r of rs) nomes.set(r.id, { nome: r.nome, tipo: 'regiao' });
    publicacao = { versao: pub.versao, publicadaEm: pub.publicadaEm?.toISOString() ?? null };
  }

  const unidadesDisp = [...new Set(indicadores.map((i) => i.unidade))];
  const unidades = unidadesDisp.map((codigo) => ({ codigo, rotulo: DOMINIOS_PADRAO.unidade_contagem.find((u) => u.codigo === codigo)?.rotulo ?? codigo }));
  const base: RespostaIndicadores = { modo: demo ? 'demo' : 'real', disponivel: false, publicacao, unidades, periodos: [], celulas: [], notas: NOTAS };
  if (!unidadesDisp.length) return { ...base, mensagem: 'Ainda não há indicadores publicados.' };

  const unidade = q.unidade && unidadesDisp.includes(q.unidade) ? q.unidade : unidadesDisp[0]!;
  const periodos = [...new Set(indicadores.filter((i) => i.unidade === unidade).map((i) => i.periodo))].sort((a, b) => (a === 'todos' ? -1 : b === 'todos' ? 1 : b.localeCompare(a)));
  const periodo = q.periodo && periodos.includes(q.periodo) ? q.periodo : (periodos.find((p) => p === 'todos') ?? periodos[0]!);
  const cubo = (CUBOS as string[]).includes(q.cubo ?? '') ? (q.cubo as Cubo) : 'territorio';
  const cabecalho = { ...base, unidade, periodo, periodos, cubo };

  // Limite de dimensões combináveis: período + 1 dimensão. Outras combinações não são pré-computadas.
  const extras = (q.filtros ?? []).filter((f) => f && f !== cubo && f !== 'total');
  if (extras.length >= 1) return { ...cabecalho, mensagem: MENSAGEM_INDISPONIVEL };

  const linhas = indicadores.filter((i) => i.unidade === unidade && i.periodo === periodo && i.cubo === cubo);
  const regiaoDe = new Map<string, string>();
  const celulaPorChave = new Map(linhas.map((l) => [`${l.territorioTipo}|${l.territorioId}`, l]));
  // bairro → região: pelo cadastro (real) ou pelo id demo.
  if (demo) {
    for (const [id, v] of nomes) if (v.tipo === 'bairro') regiaoDe.set(id, `demo-r${((Number(id.replace(/\D/g, '')) % 3) + 1)}`);
  } else {
    for (const b of await db.select({ id: bairros.id, regiaoId: bairros.regiaoId }).from(bairros)) if (b.regiaoId) regiaoDe.set(b.id, b.regiaoId);
  }
  const celulas: CelulaPublica[] = linhas.map((l) => {
    const nome = l.territorioTipo === 'municipio' ? 'Ubatuba' : (nomes.get(l.territorioId)?.nome ?? l.territorioId);
    const c: CelulaPublica = { territorioTipo: l.territorioTipo, codigo: l.territorioId, nome, dimensao: l.dimensao, rotulo: rotuloDimensao(l.dimensao, dominios), valor: l.suprimido ? null : l.valor, suprimido: l.suprimido };
    if (l.suprimido && l.territorioTipo === 'bairro') {
      const rid = regiaoDe.get(l.territorioId);
      const reg = rid ? celulaPorChave.get(`regiao|${rid}`) : undefined;
      if (reg && !reg.suprimido) c.generalizado = { codigo: reg.territorioId, nome: nomes.get(reg.territorioId)?.nome ?? '', valor: reg.valor };
    }
    return c;
  });
  void ID_CELULA_DEMO;
  return { ...cabecalho, disponivel: true, celulas };
}

/** Páginas públicas nunca quebram por falha de banco: registram o erro e mostram o estado vazio. */
export async function consultarIndicadoresPublicos(q: Parameters<typeof consultarIndicadoresPublicosInterno>[0]): Promise<RespostaIndicadores> {
  try {
    return await consultarIndicadoresPublicosInterno(q);
  } catch (e) {
    console.error('Falha ao consultar indicadores públicos (o banco foi migrado? rode `pnpm db:migrate`)', e);
    return { modo: modoDemo() ? 'demo' : 'vazio', disponivel: false, mensagem: 'Indicadores temporariamente indisponíveis.', unidades: [], periodos: [], celulas: [], notas: NOTAS };
  }
}

export type GeoPublica = {
  geojson: ColecaoGeo;
  tipo: 'bairros' | 'demonstrativa' | 'municipio';
  oficial: boolean;
  fonte: string;
  aviso?: string;
  /** Contorno do município (recorte e moldura do mapa). */
  contorno: ColecaoGeo;
};

export async function geoPublico(): Promise<GeoPublica> {
  let bairrosAtiva: { id: string } | undefined;
  try {
    [bairrosAtiva] = await db.select({ id: basesGeograficas.id }).from(basesGeograficas).where(and(eq(basesGeograficas.ativa, true), eq(basesGeograficas.tipo, 'bairros'))).limit(1);
  } catch (e) {
    console.error('Falha ao ler a base geográfica (rode `pnpm db:migrate`)', e);
  }
  if (!modoDemo() || bairrosAtiva) {
    const [base] = await db.select().from(basesGeograficas).where(and(eq(basesGeograficas.ativa, true), eq(basesGeograficas.tipo, 'bairros'))).limit(1);
    if (base) {
      const bs = await db.select({ codigo: bairros.codigo, nome: bairros.nome, geoFeatureId: bairros.geoFeatureId, id: bairros.id }).from(bairros);
      const gj = base.geojson as ColecaoGeo;
      const features = gj.features.map((f) => {
        const b = bs.find((x) => x.geoFeatureId === String(f.properties?.id ?? f.id));
        return { ...f, properties: { id: b?.id ?? String(f.properties?.id ?? f.id), nome: b?.nome ?? String(f.properties?.nome ?? ''), codigo: b?.codigo } };
      });
      return { geojson: { ...gj, features }, tipo: 'bairros', oficial: base.oficial, fonte: base.fonte, contorno: CONTORNO_MUNICIPIO };
    }
    return { geojson: CONTORNO_MUNICIPIO, tipo: 'municipio', oficial: CONTORNO_OFICIAL, fonte: FONTE_CONTORNO, contorno: CONTORNO_MUNICIPIO, aviso: 'A base oficial de bairros ainda não foi carregada: o mapa mostra apenas o contorno do município.' };
  }
  return {
    geojson: gerarCelulasDemo(CONTORNO_MUNICIPIO),
    tipo: 'demonstrativa',
    oficial: false,
    fonte: 'Células hexagonais demonstrativas sobre o contorno do município.',
    contorno: CONTORNO_MUNICIPIO,
    aviso: 'As células são demonstrativas e não representam bairros. Dados fictícios.',
  };
}

export type ResumoPublico = {
  modo: 'demo' | 'real' | 'vazio';
  atualizadoEm: string | null;
  periodo: string | null;
  totais: Array<{ chave: string; rotulo: string; valor: number | null; nota: string }>;
};

/** Resumo exibido na landing: total acumulado por unidade (medidas distintas, nunca somadas). */
export async function obterResumoPublico(): Promise<ResumoPublico> {
  const r = await consultarIndicadoresPublicos({ cubo: 'total', periodo: 'todos' });
  if (!r.unidades.length) return { modo: r.modo, atualizadoEm: null, periodo: null, totais: [] };
  const totais: ResumoPublico['totais'] = [];
  for (const u of r.unidades) {
    const x = await consultarIndicadoresPublicos({ cubo: 'total', unidade: u.codigo, periodo: 'todos' });
    const c = x.celulas[0];
    totais.push({ chave: u.codigo, rotulo: u.rotulo, valor: c?.valor ?? null, nota: c?.suprimido ? 'Valor suprimido por proteção de privacidade' : 'Acumulado do período publicado' });
  }
  return {
    modo: r.modo,
    atualizadoEm: r.publicacao?.publicadaEm ?? (r.modo === 'demo' ? '2026-10-01' : null),
    periodo: r.modo === 'demo' ? 'Últimos 12 meses (dados fictícios)' : 'Acumulado das publicações',
    totais,
  };
}

export { ROTULOS_DOMINIO, ID_MUNICIPIO, sql };
