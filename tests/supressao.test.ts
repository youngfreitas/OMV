import { describe, expect, it } from 'vitest';
import { calcularIndicadores, MENSAGEM_INDISPONIVEL } from '@/lib/publicacao/motor';
import type { Indicador, RegistroAgregavel, TerritorioCfg } from '@/lib/publicacao/tipos';

const terr: TerritorioCfg = {
  municipioId: 'ub',
  regioes: [{ id: 'r1' }, { id: 'r2' }],
  bairros: [
    { id: 'b1', regiaoId: 'r1' },
    { id: 'b2', regiaoId: 'r1' },
    { id: 'b3', regiaoId: 'r2' },
    { id: 'b4', regiaoId: 'r2' },
  ],
};
const dom = { categoria: ['fisica', 'psicologica', 'sexual'], faixa: ['18_24', '25_34'], tipo: ['atendimento_servico'] };
const cfg = { k: 5, complementar: true };

function reg(periodo: string, bairro: string, categoria: string, faixa: string, q: number, unidade = 'atendimento'): RegistroAgregavel {
  const b = terr.bairros.find((x) => x.id === bairro)!;
  return { periodo, bairroId: bairro, regiaoId: b.regiaoId, tipoRegistro: 'atendimento_servico', unidade, categoria, faixa, quantidade: q };
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const chave = (i: Pick<Indicador, 'unidade' | 'periodo' | 'territorioTipo' | 'territorioId' | 'dimensao'>) =>
  `${i.unidade}|${i.periodo}|${i.territorioTipo}|${i.territorioId}|${i.dimensao}`;

describe('supressão primária', () => {
  it('suprime 0 < valor < k e publica zeros e valores ≥ k', () => {
    const { indicadores } = calcularIndicadores([reg('2026-01', 'b1', 'fisica', '18_24', 3), reg('2026-01', 'b2', 'fisica', '18_24', 9), reg('2026-01', 'b3', 'sexual', '25_34', 6)], terr, dom, { k: 5, complementar: false });
    const get = (tt: string, id: string, dim = '', p = '2026-01') => indicadores.find((i) => i.territorioTipo === tt && i.territorioId === id && i.dimensao === dim && i.periodo === p)!;
    expect(get('bairro', 'b1')).toMatchObject({ suprimido: true, valor: null, motivo: 'primaria' });
    expect(get('bairro', 'b2')).toMatchObject({ suprimido: false, valor: 9 });
    expect(get('bairro', 'b4')).toMatchObject({ suprimido: false, valor: 0 });
  });
});

describe('supressão complementar', () => {
  it('impede recálculo por diferença: nunca resta exatamente uma célula suprimida num grupo aditivo', () => {
    // b1=3 (suprimida), b2=9: região r1 = 12 publicada → b1 seria derivável → b2 também deve ser suprimida.
    const { indicadores } = calcularIndicadores([reg('2026-01', 'b1', 'fisica', '18_24', 3), reg('2026-01', 'b2', 'fisica', '18_24', 9)], terr, dom, cfg);
    const b2 = indicadores.find((i) => i.territorioId === 'b2' && i.periodo === '2026-01' && i.dimensao === '')!;
    expect(b2).toMatchObject({ suprimido: true, motivo: 'complementar' });
  });

  it('protege entre períodos: meses suprimidos não podem ser deduzidos pelo ano', () => {
    const regs = [reg('2026-01', 'b1', 'fisica', '18_24', 2), reg('2026-02', 'b1', 'fisica', '18_24', 8), reg('2026-03', 'b1', 'fisica', '18_24', 9)];
    const { indicadores } = calcularIndicadores(regs, terr, dom, cfg);
    const mes = (m: string) => indicadores.find((i) => i.territorioId === 'b1' && i.periodo === m && i.dimensao === '')!;
    expect(mes('2026-01').suprimido).toBe(true);
    // Ano publicado (19) + dois meses publicados permitiria deduzir janeiro → um dos outros meses também é suprimido.
    const supr = ['2026-01', '2026-02', '2026-03'].filter((m) => mes(m).suprimido);
    expect(supr.length).toBeGreaterThanOrEqual(2);
  });

  it('medidas distintas nunca são somadas: cada unidade tem seus totais', () => {
    const { indicadores } = calcularIndicadores([reg('2026-01', 'b1', 'fisica', '18_24', 20, 'registro'), reg('2026-01', 'b1', 'fisica', '18_24', 30, 'atendimento')], terr, dom, cfg);
    const t = (u: string) => indicadores.find((i) => i.unidade === u && i.cubo === 'total' && i.periodo === '2026-01')!.valor;
    expect(t('registro')).toBe(20);
    expect(t('atendimento')).toBe(30);
    expect(indicadores.some((i) => i.unidade === 'todas')).toBe(false);
  });

  it('com complementar desligada, só há supressão primária', () => {
    const { relatorio } = calcularIndicadores([reg('2026-01', 'b1', 'fisica', '18_24', 3), reg('2026-01', 'b2', 'fisica', '18_24', 9)], terr, dom, { k: 5, complementar: false });
    expect(relatorio.suprimidasComplementares).toBe(0);
  });

  it('simulação de atacante: nenhuma célula suprimida pode ser resolvida por diferença (200 conjuntos aleatórios)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rnd = mulberry32(seed);
      const meses = ['2026-01', '2026-02', '2026-03'];
      const regs: RegistroAgregavel[] = [];
      for (const m of meses)
        for (const b of terr.bairros)
          for (const c of dom.categoria)
            for (const f of dom.faixa) {
              const q = Math.floor(rnd() ** 2 * 7);
              if (q > 0) regs.push(reg(m, b.id, c, f, q));
            }
      const { indicadores } = calcularIndicadores(regs, terr, dom, cfg);
      // Reconstrói os grupos aditivos a partir da saída e tenta resolver desconhecidos (propagação).
      const porChave = new Map(indicadores.map((i) => [chave(i), i]));
      const desconhecido = new Set(indicadores.filter((i) => i.suprimido).map(chave));
      const valores = new Map(indicadores.filter((i) => !i.suprimido).map((i) => [chave(i), i.valor!]));
      type G = { pai: string; filhos: string[] };
      const grupos: G[] = [];
      const periodos = [...meses, '2026', 'todos'];
      const un = 'atendimento';
      for (const p of periodos) {
        const tot = chave({ unidade: un, periodo: p, territorioTipo: 'municipio', territorioId: 'ub', dimensao: '' });
        grupos.push({ pai: tot, filhos: terr.regioes.map((r) => chave({ unidade: un, periodo: p, territorioTipo: 'regiao', territorioId: r.id, dimensao: '' })) });
        for (const r of terr.regioes)
          grupos.push({ pai: chave({ unidade: un, periodo: p, territorioTipo: 'regiao', territorioId: r.id, dimensao: '' }), filhos: terr.bairros.filter((b) => b.regiaoId === r.id).map((b) => chave({ unidade: un, periodo: p, territorioTipo: 'bairro', territorioId: b.id, dimensao: '' })) });
        for (const [pref, lista] of [['categoria', dom.categoria], ['faixa', dom.faixa], ['tipo', dom.tipo]] as const)
          grupos.push({ pai: tot, filhos: lista.map((c) => chave({ unidade: un, periodo: p, territorioTipo: 'municipio', territorioId: 'ub', dimensao: `${pref}:${c}` })) });
      }
      const fam = [...new Set(indicadores.filter((i) => i.periodo === '2026-01').map((i) => `${i.territorioTipo}|${i.territorioId}|${i.dimensao}`))];
      for (const f of fam) {
        const [tt, ti, d] = f.split('|') as [Indicador['territorioTipo'], string, string];
        const mk = (p: string) => chave({ unidade: un, periodo: p, territorioTipo: tt, territorioId: ti, dimensao: d });
        grupos.push({ pai: mk('2026'), filhos: meses.map(mk) });
        grupos.push({ pai: mk('todos'), filhos: [mk('2026')] });
      }
      let progresso = true;
      while (progresso) {
        progresso = false;
        for (const g of grupos) {
          const nos = [g.pai, ...g.filhos].filter((k) => porChave.has(k));
          const desc = nos.filter((k) => desconhecido.has(k));
          if (desc.length === 1) {
            const k = desc[0]!;
            const soma = g.filhos.filter((x) => x !== k).reduce((s, x) => s + (valores.get(x) ?? 0), 0);
            const v = k === g.pai ? soma : (valores.get(g.pai) ?? NaN) - soma;
            if (!Number.isNaN(v)) {
              desconhecido.delete(k);
              valores.set(k, v);
              progresso = true;
            }
          }
        }
      }
      // Nenhum valor suprimido pode ter sido recuperado.
      const recuperado = indicadores.filter((i) => i.suprimido && !desconhecido.has(chave(i)));
      expect(recuperado.map(chave), `seed ${seed}`).toEqual([]);
    }
  });
});

describe('mensagem de indisponibilidade', () => {
  it('texto institucional exato', () => {
    expect(MENSAGEM_INDISPONIVEL).toBe('Dados indisponíveis para divulgação nesta combinação de filtros.');
  });
});
