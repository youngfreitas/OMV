import {
  SEM_REGIAO,
  type ConfigSupressao,
  type Cubo,
  type DominiosCubos,
  type Indicador,
  type RegistroAgregavel,
  type RelatorioSupressao,
  type TerritorioCfg,
} from './tipos';

type No = {
  key: string;
  unidade: string;
  periodo: string;
  territorioTipo: Indicador['territorioTipo'];
  territorioId: string;
  dimensao: string;
  valor: number;
  suprimido: boolean;
  motivo: 'primaria' | 'complementar' | null;
};
type Grupo = { pai: string; filhos: string[] };

const chave = (u: string, p: string, tt: string, ti: string, d: string) => `${u}|${p}|${tt}|${ti}|${d}`;

function cuboDe(n: Pick<No, 'territorioTipo' | 'dimensao'>): Cubo {
  if (n.territorioTipo !== 'municipio') return 'territorio';
  if (n.dimensao === '') return 'total';
  return n.dimensao.split(':')[0] as Cubo;
}

/**
 * Motor de agregação + supressão estatística.
 *
 * - Cubos 1-D por período: total, território (bairro e região), categoria, faixa etária, tipo de registro.
 * - Cada unidade de contagem é uma medida independente (nunca somadas entre si).
 * - Períodos: mês, ano e "todos" (os meses somam o ano; os anos somam "todos").
 * - Supressão primária: 0 < valor < k.
 * - Supressão complementar: nenhum grupo aditivo (total = soma das partes) pode ter exatamente uma célula
 *   suprimida (seria recalculável por diferença); grupos com duas suprimidas sem intervalo de proteção também.
 */
export function calcularIndicadores(
  registros: RegistroAgregavel[],
  territorio: TerritorioCfg,
  dominios: DominiosCubos,
  cfg: ConfigSupressao,
): { indicadores: Indicador[]; relatorio: RelatorioSupressao } {
  const nos = new Map<string, No>();
  const grupos: Grupo[] = [];
  const regiaoDoBairro = new Map(territorio.bairros.map((b) => [b.id, b.regiaoId ?? SEM_REGIAO]));
  const regioesIds = [...new Set([...territorio.regioes.map((r) => r.id), ...(territorio.bairros.some((b) => !b.regiaoId) ? [SEM_REGIAO] : [])])];
  const bairrosDaRegiao = (r: string) => territorio.bairros.filter((b) => (b.regiaoId ?? SEM_REGIAO) === r).map((b) => b.id);

  const unidades = [...new Set(registros.map((r) => r.unidade))].sort();
  const mesesTodos = [...new Set(registros.map((r) => r.periodo))].sort();
  const anos = [...new Set(mesesTodos.map((m) => m.slice(0, 4)))].sort();

  const garantir = (u: string, p: string, tt: No['territorioTipo'], ti: string, d: string): No => {
    const k = chave(u, p, tt, ti, d);
    let n = nos.get(k);
    if (!n) {
      n = { key: k, unidade: u, periodo: p, territorioTipo: tt, territorioId: ti, dimensao: d, valor: 0, suprimido: false, motivo: null };
      nos.set(k, n);
    }
    return n;
  };

  for (const u of unidades) {
    const regs = registros.filter((r) => r.unidade === u);
    const meses = [...new Set(regs.map((r) => r.periodo))].sort();
    const anosU = [...new Set(meses.map((m) => m.slice(0, 4)))];

    // Estrutura de nós por mês (zeros incluídos para as dimensões do domínio).
    const familias: Array<{ tt: No['territorioTipo']; ti: string; d: string }> = [{ tt: 'municipio', ti: territorio.municipioId, d: '' }];
    for (const b of territorio.bairros) familias.push({ tt: 'bairro', ti: b.id, d: '' });
    for (const r of regioesIds) familias.push({ tt: 'regiao', ti: r, d: '' });
    for (const c of dominios.categoria) familias.push({ tt: 'municipio', ti: territorio.municipioId, d: `categoria:${c}` });
    for (const f of dominios.faixa) familias.push({ tt: 'municipio', ti: territorio.municipioId, d: `faixa:${f}` });
    for (const t of dominios.tipo) familias.push({ tt: 'municipio', ti: territorio.municipioId, d: `tipo:${t}` });

    for (const m of meses) for (const f of familias) garantir(u, m, f.tt, f.ti, f.d);

    for (const r of regs) {
      const bairro = r.bairroId;
      const reg = bairro ? (regiaoDoBairro.get(bairro) ?? SEM_REGIAO) : (r.regiaoId ?? SEM_REGIAO);
      const inc = (tt: No['territorioTipo'], ti: string, d: string) => {
        const n = nos.get(chave(u, r.periodo, tt, ti, d));
        if (n) n.valor += r.quantidade;
      };
      inc('municipio', territorio.municipioId, '');
      if (bairro) inc('bairro', bairro, '');
      inc('regiao', reg, '');
      inc('municipio', territorio.municipioId, `categoria:${r.categoria}`);
      inc('municipio', territorio.municipioId, `faixa:${r.faixa}`);
      inc('municipio', territorio.municipioId, `tipo:${r.tipoRegistro}`);
    }

    // Nós de ano e "todos" + grupos de período (meses → ano → todos).
    for (const f of familias) {
      for (const a of anosU) {
        const filhos = meses.filter((m) => m.startsWith(a)).map((m) => chave(u, m, f.tt, f.ti, f.d));
        const pai = garantir(u, a, f.tt, f.ti, f.d);
        pai.valor = filhos.reduce((s, k) => s + nos.get(k)!.valor, 0);
        grupos.push({ pai: pai.key, filhos });
      }
      const todos = garantir(u, 'todos', f.tt, f.ti, f.d);
      const fa = anosU.map((a) => chave(u, a, f.tt, f.ti, f.d));
      todos.valor = fa.reduce((s, k) => s + nos.get(k)!.valor, 0);
      grupos.push({ pai: todos.key, filhos: fa });
    }

    // Grupos de partição dentro de cada período (mês, ano, todos).
    for (const p of [...meses, ...anosU, 'todos']) {
      const total = chave(u, p, 'municipio', territorio.municipioId, '');
      grupos.push({ pai: total, filhos: regioesIds.map((r) => chave(u, p, 'regiao', r, '')) });
      for (const r of regioesIds) {
        const bs = bairrosDaRegiao(r);
        if (bs.length) grupos.push({ pai: chave(u, p, 'regiao', r, ''), filhos: bs.map((b) => chave(u, p, 'bairro', b, '')) });
      }
      for (const [pref, lista] of [
        ['categoria', dominios.categoria],
        ['faixa', dominios.faixa],
        ['tipo', dominios.tipo],
      ] as const) {
        grupos.push({ pai: total, filhos: lista.map((c) => chave(u, p, 'municipio', territorio.municipioId, `${pref}:${c}`)) });
      }
    }
  }
  void anos;

  // Supressão primária.
  for (const n of nos.values()) {
    if (n.valor > 0 && n.valor < cfg.k) {
      n.suprimido = true;
      n.motivo = 'primaria';
    }
  }

  // Supressão complementar (ponto fixo).
  if (cfg.complementar) {
    const limites = (n: No) => ({ min: n.motivo === 'primaria' ? 1 : 0, max: n.motivo === 'primaria' ? cfg.k - 1 : Infinity });
    let mudou = true;
    let guarda = 0;
    while (mudou && guarda++ < 10_000) {
      mudou = false;
      for (const g of grupos) {
        const pai = nos.get(g.pai)!;
        const filhos = g.filhos.map((k) => nos.get(k)!).filter(Boolean);
        if (!filhos.length) continue;
        const todos = [pai, ...filhos];
        const supr = todos.filter((n) => n.suprimido);
        const suprimirMenor = (excluir: No[]) => {
          const cand = filhos.filter((f) => !f.suprimido && f.valor > 0 && !excluir.includes(f)).sort((a, b) => a.valor - b.valor || a.key.localeCompare(b.key))[0];
          const alvo = cand ?? (pai.suprimido ? undefined : pai);
          if (alvo) {
            alvo.suprimido = true;
            alvo.motivo ??= 'complementar';
            mudou = true;
          }
        };
        if (supr.length === 1) {
          suprimirMenor([]);
        } else if (supr.length === 2 && !pai.suprimido) {
          // Duas filhas suprimidas, total publicado: a soma das duas é conhecida (S).
          const [a, b] = supr as [No, No];
          const S = pai.valor - filhos.filter((f) => !f.suprimido).reduce((s, f) => s + f.valor, 0);
          const la = limites(a);
          const lb = limites(b);
          const loA = Math.max(la.min, S - lb.max);
          const hiA = Math.min(la.max, S - lb.min);
          if (loA >= hiA) suprimirMenor([a, b]);
        }
      }
    }
  }

  const indicadores: Indicador[] = [...nos.values()]
    .map((n) => ({
      cubo: cuboDe(n),
      periodo: n.periodo,
      unidade: n.unidade,
      territorioTipo: n.territorioTipo,
      territorioId: n.territorioId,
      dimensao: n.dimensao,
      valor: n.suprimido ? null : n.valor,
      suprimido: n.suprimido,
      motivo: n.motivo,
    }))
    .sort((a, b) => a.unidade.localeCompare(b.unidade) || a.periodo.localeCompare(b.periodo) || a.cubo.localeCompare(b.cubo) || a.territorioId.localeCompare(b.territorioId) || a.dimensao.localeCompare(b.dimensao));

  const porUnidade: RelatorioSupressao['porUnidade'] = {};
  for (const i of indicadores) {
    const e = (porUnidade[i.unidade] ??= { celulas: 0, suprimidas: 0 });
    e.celulas++;
    if (i.suprimido) e.suprimidas++;
  }
  const relatorio: RelatorioSupressao = {
    k: cfg.k,
    complementar: cfg.complementar,
    celulas: indicadores.length,
    publicadas: indicadores.filter((i) => !i.suprimido).length,
    suprimidasPrimarias: indicadores.filter((i) => i.motivo === 'primaria').length,
    suprimidasComplementares: indicadores.filter((i) => i.motivo === 'complementar').length,
    porUnidade,
  };
  return { indicadores, relatorio };
}

export const MENSAGEM_INDISPONIVEL = 'Dados indisponíveis para divulgação nesta combinação de filtros.';
