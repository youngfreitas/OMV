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

let cache: RegistroDemo[] | null = null;

export function celulaDemoNome(i: number) {
  return `Célula demonstrativa ${String(i).padStart(2, '0')}`;
}

export function regiaoDaCelula(i: number) {
  return REGIOES_DEMO[i % REGIOES_DEMO.length]!;
}

/** Gera 12 meses × n células × categorias. `nCelulas` ajusta-se à malha demonstrativa. */
export function registrosDemo(nCelulas = 24, mesFinal = '2026-09'): RegistroDemo[] {
  if (cache && cache.length) return cache;
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
  cache = out;
  return out;
}
