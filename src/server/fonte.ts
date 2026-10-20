import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bairros, entidades, regioes, registrosAprovados } from '@/lib/db/schema';
import { DOMINIOS_PADRAO, type Dominios, dominiosPadrao } from '@/lib/dicionario/dominios';
import { ENTIDADES_DEMO, registrosDemo, territorioDemo } from '@/lib/demo/dados';
import { modoDemo } from '@/lib/demo/modo';
import { CONTORNO_MUNICIPIO } from '@/lib/geo/contorno';
import { gerarCelulasDemo } from '@/lib/geo/celulas-demo';
import type { TerritorioCfg } from '@/lib/publicacao/tipos';
import { carregarDominios } from '@/server/cadastros';

export type RegistroRico = {
  periodo: string;
  entidadeId: string;
  bairroId: string | null;
  regiaoId: string | null;
  tipoRegistro: string;
  unidade: string;
  categoria: string;
  faixa: string;
  quantidade: number;
};

export type FonteBase = {
  demo: boolean;
  registros: RegistroRico[];
  territorio: TerritorioCfg;
  nomes: Map<string, string>; // bairros e regiões
  entidades: Array<{ id: string; nome: string }>;
  dominios: Dominios;
};

/** Registros aprovados ativos (reais). No modo demonstração sem dados reais, usa as fixtures fictícias. */
export async function carregarFonte(opcoes: { permitirDemo?: boolean } = {}): Promise<FonteBase> {
  const regs = await db.select().from(registrosAprovados).where(eq(registrosAprovados.ativo, true));
  if (opcoes.permitirDemo !== false && modoDemo() && regs.length === 0) {
    const n = gerarCelulasDemo(CONTORNO_MUNICIPIO).features.length;
    const t = territorioDemo(n);
    const nomes = new Map([...t.nomes].map(([id, v]) => [id, v.nome] as const));
    const ents = ENTIDADES_DEMO.map((nome, i) => ({ id: `demo-e${i}`, nome }));
    return {
      demo: true,
      registros: registrosDemo(n).map((r) => {
        const i = Number(r.celula.replace(/\D/g, ''));
        return {
          periodo: r.periodo,
          entidadeId: ents.find((e) => e.nome === r.entidade)?.id ?? 'demo-e0',
          bairroId: `demo-${String(i).padStart(3, '0')}`,
          regiaoId: `demo-r${(i % 3) + 1}`,
          tipoRegistro: r.tipoRegistro,
          unidade: r.unidade,
          categoria: r.categoria,
          faixa: r.faixa,
          quantidade: r.quantidade,
        };
      }),
      territorio: t.cfg,
      nomes,
      entidades: ents,
      dominios: dominiosPadrao(),
    };
  }
  const [bs, rs, es, dom] = await Promise.all([
    db.select().from(bairros).where(eq(bairros.ativo, true)),
    db.select().from(regioes).where(eq(regioes.ativo, true)),
    db.select().from(entidades),
    carregarDominios(),
  ]);
  const nomes = new Map<string, string>();
  for (const b of bs) nomes.set(b.id, b.nome);
  for (const r of rs) nomes.set(r.id, r.nome);
  return {
    demo: false,
    registros: regs.map((r) => ({
      periodo: r.periodo,
      entidadeId: r.entidadeId,
      bairroId: r.bairroId,
      regiaoId: r.regiaoId,
      tipoRegistro: r.tipoRegistro,
      unidade: r.unidadeContagem,
      categoria: r.categoriaViolencia,
      faixa: r.faixaEtaria,
      quantidade: r.quantidade,
    })),
    territorio: { municipioId: '3555406', bairros: bs.map((b) => ({ id: b.id, regiaoId: b.regiaoId })), regioes: rs.map((r) => ({ id: r.id })) },
    nomes,
    entidades: es.map((e) => ({ id: e.id, nome: e.nome })),
    dominios: dom,
  };
}

export const ROT_UNIDADE_PADRAO = DOMINIOS_PADRAO.unidade_contagem;
