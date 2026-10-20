/**
 * Dados FICTÍCIOS determinísticos para o modo demonstração.
 * Ficam fora do banco; nunca representam pessoas, bairros ou entidades reais.
 */
import { DOMINIOS_PADRAO } from '../dicionario/dominios';

export type RegistroDemo = {
  periodo: string; // YYYY-MM
  regiao: string;
  celula: string;
  categoria: string;
  faixa: string;
  tipoRegistro: string;
  unidade: string;
  entidade: string;
  quantidade: number;
};

export const REGIOES_DEMO = ['Região demonstrativa A', 'Região demonstrativa B', 'Região demonstrativa C'];
export const ENTIDADES_DEMO = ['Entidade demonstrativa 1', 'Entidade demonstrativa 2', 'Entidade demonstrativa 3'];

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<number, RegistroDemo[]>();

export function celulaDemoNome(i: number) {
  return `Célula demonstrativa ${String(i).padStart(2, '0')}`;
}

export function regiaoDaCelula(i: number) {
  return REGIOES_DEMO[i % REGIOES_DEMO.length]!;
}

/** Gera 12 meses × n células × categorias. `nCelulas` ajusta-se à malha demonstrativa. */
export function registrosDemo(nCelulas = 24, mesFinal = '2026-09'): RegistroDemo[] {
  const emCache = cache.get(nCelulas);
  if (emCache) return emCache;
  const rnd = mulberry32(20260920);
  const [ano, mes] = mesFinal.split('-').map(Number) as [number, number];
  const meses: string[] = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(Date.UTC(ano, mes - 1 - k, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const out: RegistroDemo[] = [];
  const peso = (i: number) => 0.4 + ((i * 7) % 11) / 8;
  for (const periodo of meses) {
    for (let c = 1; c <= nCelulas; c++) {
      for (const cat of DOMINIOS_PADRAO.categoria_violencia) {
        for (const faixa of DOMINIOS_PADRAO.faixa_etaria) {
          const base = peso(c) * (cat.codigo === 'psicologica' ? 1.6 : cat.codigo === 'fisica' ? 1.2 : 0.5);
          const q = Math.floor(rnd() * 3.2 * base);
          if (q <= 0) continue;
          out.push({
            periodo,
            regiao: regiaoDaCelula(c),
            celula: celulaDemoNome(c),
            categoria: cat.codigo,
            faixa: faixa.codigo,
            tipoRegistro: 'atendimento_servico',
            unidade: 'atendimento',
            entidade: ENTIDADES_DEMO[(c + periodo.length) % ENTIDADES_DEMO.length]!,
            quantidade: q,
          });
        }
      }
    }
  }
  cache.set(nCelulas, out);
  return out;
}

import type { RegistroAgregavel, TerritorioCfg } from '../publicacao/tipos';

export const ID_REGIAO_DEMO = (i: number) => `demo-r${(i % REGIOES_DEMO.length) + 1}`;
export const ID_CELULA_DEMO = (i: number) => `demo-${String(i).padStart(3, '0')}`;

/** Território demonstrativo: células hexagonais (NÃO são bairros) agrupadas em 3 regiões fictícias. */
export function territorioDemo(nCelulas: number): {
  cfg: TerritorioCfg;
  nomes: Map<string, { nome: string; tipo: 'bairro' | 'regiao' }>;
} {
  const nomes = new Map<string, { nome: string; tipo: 'bairro' | 'regiao' }>();
  const regioes = REGIOES_DEMO.map((nome, k) => {
    const id = `demo-r${k + 1}`;
    nomes.set(id, { nome, tipo: 'regiao' });
    return { id };
  });
  const bairros = Array.from({ length: nCelulas }, (_, k) => {
    const i = k + 1;
    nomes.set(ID_CELULA_DEMO(i), { nome: celulaDemoNome(i), tipo: 'bairro' });
    return { id: ID_CELULA_DEMO(i), regiaoId: ID_REGIAO_DEMO(i) };
  });
  return { cfg: { municipioId: '3555406', bairros, regioes }, nomes };
}

export function registrosDemoAgregaveis(nCelulas: number): RegistroAgregavel[] {
  return registrosDemo(nCelulas).map((r) => {
    const i = Number(r.celula.replace(/\D/g, ''));
    return {
      periodo: r.periodo,
      bairroId: ID_CELULA_DEMO(i),
      regiaoId: ID_REGIAO_DEMO(i),
      tipoRegistro: r.tipoRegistro,
      unidade: r.unidade,
      categoria: r.categoria,
      faixa: r.faixa,
      quantidade: r.quantidade,
    };
  });
}
