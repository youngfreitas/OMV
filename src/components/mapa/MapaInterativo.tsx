'use client';

import { geoMercator, geoPath } from 'd3-geo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Banner, Button, EmptyState, SelectField } from '@/components/ds';
import { fmtMes, fmtNumero } from '@/lib/formato';
import { orientarParaD3 } from '@/lib/geo/orientacao';
import type { ColecaoGeo } from '@/lib/geo/tipos';
import type { GeoPublica, RespostaIndicadores } from '@/server/publico';

const W = 800;
const H = 560;
const CLASSES = ['var(--mapa-1)', 'var(--mapa-2)', 'var(--mapa-3)', 'var(--mapa-4)', 'var(--mapa-5)'];
const CUBOS = [
  { v: 'territorio', r: 'Território (mapa)' },
  { v: 'categoria', r: 'Categoria de violência' },
  { v: 'faixa', r: 'Faixa etária' },
  { v: 'tipo', r: 'Tipo de registro' },
];

const rotP = (p: string) => (p === 'todos' ? 'Todo o período' : /^\d{4}$/.test(p) ? `Ano ${p}` : fmtMes(p));

/** Limiares por quantis dos valores publicados (até 5 classes). */
function limiares(valores: number[]): number[] {
  const v = [...new Set(valores)].sort((a, b) => a - b);
  if (v.length <= 1) return [];
  const n = Math.min(5, v.length);
  return Array.from({ length: n - 1 }, (_, i) => v[Math.floor(((i + 1) * v.length) / n)]!);
}
const classeDe = (valor: number, cortes: number[]) => cortes.filter((c) => valor >= c).length;

type Props = { geoInicial: GeoPublica; inicial: RespostaIndicadores };

export function MapaInterativo({ geoInicial, inicial }: Props) {
  const [resp, setResp] = useState<RespostaIndicadores>(inicial);
  const [cubo, setCubo] = useState<string>('territorio');
  const [unidade, setUnidade] = useState(inicial.unidade ?? '');
  const [periodo, setPeriodo] = useState(inicial.periodo ?? 'todos');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [vista, setVista] = useState<'mapa' | 'tabela'>('mapa');
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const arrasto = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const primeira = useRef(true);

  const buscar = useCallback(async (c: string, u: string, p: string) => {
    setCarregando(true);
    setErro(null);
    try {
      const qs = new URLSearchParams({ cubo: c, ...(u ? { unidade: u } : {}), periodo: p });
      const r = await fetch(`/api/publico/indicadores?${qs}`);
      if (!r.ok) throw new Error(String(r.status));
      setResp(await r.json());
    } catch {
      setErro('Não foi possível carregar os indicadores. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    void buscar(cubo, unidade, periodo);
  }, [cubo, unidade, periodo, buscar]);

  const geo = useMemo(() => {
    const g = geoInicial.geojson as ColecaoGeo;
    return { ...g, features: g.features.map((f) => ({ ...f, geometry: orientarParaD3(f.geometry) })) } as ColecaoGeo;
  }, [geoInicial.geojson]);
  const { areas: caminhos, contornoD } = useMemo(() => {
    const cont = { ...geoInicial.contorno, features: geoInicial.contorno.features.map((f) => ({ ...f, geometry: orientarParaD3(f.geometry) })) };
    const proj = geoMercator().fitExtent([[16, 16], [W - 16, H - 16]], { type: 'FeatureCollection', features: cont.features } as never);
    const path = geoPath(proj);
    const contornoD = cont.features.map((f) => path(f as never) ?? '').join(' ');
    const areas = geo.features.flatMap((f, i) => {
      const d = path(f as never);
      return d ? [{ id: String(f.properties?.id ?? f.properties?.codigoIbge ?? i), nome: String(f.properties?.nome ?? `Área ${i + 1}`), d }] : [];
    });
    return { areas, contornoD };
  }, [geo, geoInicial.contorno]);

  const porId = useMemo(() => new Map(resp.celulas.map((c) => [c.codigo, c])), [resp.celulas]);
  const bairrosCel = resp.celulas.filter((c) => c.territorioTipo === 'bairro');
  const regioesCel = resp.celulas.filter((c) => c.territorioTipo === 'regiao');
  const cortes = useMemo(() => limiares(bairrosCel.filter((c) => !c.suprimido).map((c) => c.valor ?? 0)), [bairrosCel]);
  const mostraMapa = cubo === 'territorio' && geoInicial.tipo !== 'municipio';
  const unidadeRotulo = resp.unidades.find((u) => u.codigo === (resp.unidade ?? unidade))?.rotulo ?? '';
  const sel = selecionado ? porId.get(selecionado) : undefined;
  const selNome = selecionado ? (caminhos.find((c) => c.id === selecionado)?.nome ?? sel?.nome) : undefined;

  const zoom = (f: number) => setT((a) => ({ k: Math.min(8, Math.max(1, a.k * f)), x: a.x, y: a.y }));
  const ajustaLimite = (x: number, y: number, k: number) => ({ x: Math.min(0, Math.max(W - W * k, x)), y: Math.min(0, Math.max(H - H * k, y)) });

  const fillDe = (id: string) => {
    const c = porId.get(id);
    if (!c) return 'var(--fundo-rebaixado)';
    if (c.suprimido) return 'url(#hachura)';
    return CLASSES[Math.min(4, classeDe(c.valor ?? 0, cortes))]!;
  };

  return (
    <div className="mapa-wrap">
      <div className="omv-filtros mapa-filtros" role="group" aria-label="Filtros do mapa">
        <SelectField label="Medida" value={resp.unidade ?? unidade} options={resp.unidades.map((u) => ({ value: u.codigo, label: u.rotulo }))} onChange={(e) => setUnidade(e.target.value)} disabled={!resp.unidades.length} />
        <SelectField label="Período" value={resp.periodo ?? periodo} options={(resp.periodos.length ? resp.periodos : ['todos']).map((p) => ({ value: p, label: rotP(p) }))} onChange={(e) => setPeriodo(e.target.value)} />
        <SelectField label="Ver por" value={cubo} options={CUBOS.map((c) => ({ value: c.v, label: c.r }))} onChange={(e) => { setCubo(e.target.value); setSelecionado(null); }} />
      </div>

      {erro ? (
        <Banner tipo="erro" titulo="Erro ao carregar">
          {erro} <Button size="sm" variant="secondary" onClick={() => buscar(cubo, unidade, periodo)}>Tentar novamente</Button>
        </Banner>
      ) : null}
      {carregando ? <p role="status" className="omv-legenda">Carregando indicadores…</p> : null}

      {!resp.unidades.length && !carregando ? (
        <div className="omv-painel">
          <EmptyState titulo="Ainda não há indicadores publicados" icon="mapa">
            O mapa mostrará os valores assim que a primeira publicação for aprovada, com as proteções de privacidade.
          </EmptyState>
        </div>
      ) : null}

      {resp.unidades.length > 0 && !resp.disponivel && !carregando ? (
        <Banner tipo="info" titulo="Indisponível">{resp.mensagem}</Banner>
      ) : null}

      {resp.disponivel ? (
        <>
          <div className="omv-linha mapa-abas" role="tablist" aria-label="Forma de visualização">
            {cubo === 'territorio' ? (
              <>
                <button role="tab" aria-selected={vista === 'mapa'} className="omv-tab" onClick={() => setVista('mapa')}>Mapa</button>
                <button role="tab" aria-selected={vista === 'tabela'} className="omv-tab" onClick={() => setVista('tabela')}>Tabela</button>
              </>
            ) : null}
          </div>
          {geoInicial.aviso ? <Banner tipo={geoInicial.tipo === 'demonstrativa' ? 'demo' : 'info'}>{geoInicial.aviso}</Banner> : null}

          {mostraMapa && vista === 'mapa' ? (
            <div className="mapa-grade">
              <figure className="omv-painel mapa-fig">
                <div className="mapa-ferramentas">
                  <Button size="sm" variant="secondary" icon="mais" aria-label="Aproximar" onClick={() => zoom(1.4)} />
                  <Button size="sm" variant="secondary" aria-label="Afastar" onClick={() => setT((a) => { const k = Math.max(1, a.k / 1.4); return { k, ...ajustaLimite(a.x, a.y, k) }; })}>−</Button>
                  <Button size="sm" variant="ghost" onClick={() => setT({ k: 1, x: 0, y: 0 })}>Reiniciar</Button>
                </div>
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  role="group"
                  aria-label={`Mapa de ${unidadeRotulo.toLowerCase()} por território. Use Tab para navegar pelas áreas e Enter para ver detalhes. Há uma visão em tabela equivalente.`}
                  className="mapa-svg"
                  onWheel={(e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }}
                  onPointerDown={(e) => { arrasto.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y }; }}
                  onPointerMove={(e) => {
                    const a = arrasto.current;
                    if (!a || t.k === 1) return;
                    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                    const esc = W / r.width;
                    setT((p) => ({ k: p.k, ...ajustaLimite(a.tx + (e.clientX - a.x) * esc, a.ty + (e.clientY - a.y) * esc, p.k) }));
                  }}
                  onPointerUp={() => (arrasto.current = null)}
                  onPointerLeave={() => (arrasto.current = null)}
                >
                  <defs>
                    <pattern id="hachura" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="8" height="8" fill="var(--fundo-rebaixado)" />
                      <line x1="0" y1="0" x2="0" y2="8" stroke="var(--linha-forte)" strokeWidth="2" />
                    </pattern>
                  </defs>
                  <clipPath id="recorte"><path d={contornoD} /></clipPath>
                  <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>
                    <path d={contornoD} fill="var(--fundo-elevado)" stroke="none" />
                    <g clipPath={geoInicial.tipo === 'demonstrativa' ? 'url(#recorte)' : undefined}>
                    {caminhos.map((c) => {
                      const cel = porId.get(c.id);
                      const ativo = selecionado === c.id;
                      return (
                        <path
                          key={c.id}
                          d={c.d}
                          fill={fillDe(c.id)}
                          className={`mapa-area${ativo ? ' ativo' : ''}`}
                          strokeWidth={(ativo ? 3 : 1) / t.k}
                          tabIndex={0}
                          role="button"
                          aria-pressed={ativo}
                          aria-label={`${c.nome}: ${cel ? (cel.suprimido ? 'valor suprimido por proteção de privacidade' : `${fmtNumero(cel.valor ?? 0)} ${unidadeRotulo.toLowerCase()}`) : 'sem dado'}`}
                          onClick={() => setSelecionado(c.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelecionado(c.id); } }}
                        />
                      );
                    })}
                    </g>
                    <path d={contornoD} fill="none" stroke="var(--roxo)" strokeWidth={2 / t.k} strokeLinejoin="round" pointerEvents="none" />
                  </g>
                </svg>
                <figcaption className="omv-legenda">
                  {resp.publicacao?.publicadaEm ? `Atualizado em ${new Date(resp.publicacao.publicadaEm).toLocaleDateString('pt-BR')} · ` : ''}
                  {rotP(resp.periodo ?? periodo)} · {unidadeRotulo}
                </figcaption>
                <div className="mapa-legenda" aria-label="Legenda">
                  <span className="omv-legenda">Menor</span>
                  {CLASSES.slice(0, Math.max(1, cortes.length + 1)).map((c, i) => (
                    <span key={i} className="mapa-chip" style={{ background: c }} />
                  ))}
                  <span className="omv-legenda">Maior</span>
                  <span className="mapa-chip mapa-chip-supr" /> <span className="omv-legenda">Suprimido</span>
                </div>
              </figure>

              <aside className="omv-painel mapa-lateral" aria-live="polite">
                <h2>{selNome ?? 'Selecione uma área'}</h2>
                {!selecionado ? <p className="omv-muted">Clique ou use o teclado para ver o valor de cada área.</p> : null}
                {selecionado && !sel ? <p className="omv-muted">Sem dado publicado para esta área.</p> : null}
                {sel ? (
                  sel.suprimido ? (
                    <>
                      <p><strong>Valor suprimido</strong> para proteger a privacidade de quem foi atendida.</p>
                      {sel.generalizado ? <p>Valor da região <strong>{sel.generalizado.nome}</strong>: {sel.generalizado.valor === null ? 'suprimido' : `${fmtNumero(sel.generalizado.valor)} ${unidadeRotulo.toLowerCase()}`}.</p> : null}
                    </>
                  ) : (
                    <p style={{ fontSize: 28, margin: 0 }}>{fmtNumero(sel.valor ?? 0)} <span className="omv-legenda">{unidadeRotulo.toLowerCase()}</span></p>
                  )
                ) : null}
                <hr style={{ border: 0, borderTop: '1px solid var(--linha)', margin: '16px 0' }} />
                <h3 style={{ fontSize: 14 }}>Regiões</h3>
                <ul className="mapa-lista">
                  {regioesCel.map((r) => (
                    <li key={r.codigo}>{r.nome}: <strong>{r.suprimido ? 'suprimido' : fmtNumero(r.valor ?? 0)}</strong></li>
                  ))}
                </ul>
              </aside>
            </div>
          ) : (
            <TabelaCelulas celulas={resp.celulas} unidade={unidadeRotulo} periodo={rotP(resp.periodo ?? periodo)} cubo={cubo} semBairros={geoInicial.tipo === 'municipio'} />
          )}
          <ul className="omv-legenda mapa-notas">
            {resp.notas.map((n) => (<li key={n}>{n}</li>))}
          </ul>
        </>
      ) : null}
      <noscript><p>O mapa interativo exige JavaScript. Use a tabela de indicadores.</p></noscript>
    </div>
  );
}

function TabelaCelulas({ celulas, unidade, periodo, cubo, semBairros }: { celulas: RespostaIndicadores['celulas']; unidade: string; periodo: string; cubo: string; semBairros: boolean }) {
  const linhas = [...celulas].sort((a, b) => (a.territorioTipo === b.territorioTipo ? (b.valor ?? -1) - (a.valor ?? -1) : a.territorioTipo.localeCompare(b.territorioTipo)));
  return (
    <div className="omv-table-wrap" role="region" aria-label="Tabela de indicadores" tabIndex={0}>
      {semBairros && cubo === 'territorio' ? <p className="omv-legenda" style={{ padding: 12 }}>A base oficial de bairros ainda não foi carregada: a tabela mostra municípios e regiões disponíveis.</p> : null}
      <table className="omv-table">
        <caption className="omv-sr">{unidade} — {periodo}</caption>
        <thead><tr><th>{cubo === 'territorio' ? 'Território' : 'Categoria'}</th><th>Nível</th><th className="num">{unidade}</th></tr></thead>
        <tbody>
          {linhas.map((c) => (
            <tr key={`${c.territorioTipo}-${c.codigo}-${c.dimensao}`}>
              <td>{c.rotulo || c.nome}</td>
              <td>{c.territorioTipo === 'municipio' ? 'Município' : c.territorioTipo === 'regiao' ? 'Região' : 'Bairro'}</td>
              <td className="num">{c.suprimido ? 'suprimido' : fmtNumero(c.valor ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
