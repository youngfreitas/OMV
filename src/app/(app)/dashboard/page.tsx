import { Banner, Button, EmptyState, Pagina, SelectField, StatCard } from '@/components/ds';
import { GraficoBarras } from '@/components/charts/Graficos';
import { requirePermission } from '@/lib/auth/guards';
import { fmtNumero } from '@/lib/formato';
import { metricasAnalise } from '@/server/analise';
import { opcoesFiltros, painelDados, type Filtros } from '@/server/dados';
import { listarVisualizacoes } from '@/server/visualizacoes';
import { Visoes } from './Visoes';
import { fmtMes } from '@/lib/formato';

export const metadata = { title: 'Dashboard' };

const rotP = (p: string) => (p === 'todos' ? 'Todo o período' : /^\d{4}$/.test(p) ? `Ano ${p}` : fmtMes(p));

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requirePermission('dados:ver_agregado');
  const q = await searchParams;
  const f: Filtros = { unidade: q.unidade, periodo: q.periodo, entidadeId: q.entidade, regiaoId: q.regiao, bairroId: q.bairro, categoria: q.categoria, faixa: q.faixa, tipo: q.tipo };
  const [d, op, salvas] = await Promise.all([painelDados(u, f), opcoesFiltros(u), listarVisualizacoes(u)]);
  const irrestrito = !d.restrito;
  const adm = u.permissoes.has('analise:ler') ? await metricasAnalise(u) : null;
  const unidadeRotulo = d.unidades.find((x) => x.codigo === d.unidade)?.rotulo ?? d.unidade;
  const fonte = d.restrito ? 'registros aprovados (valores com supressão estatística)' : 'registros aprovados — uso interno, sem supressão';
  const opcoes = (dom: string) => [{ value: '', label: 'Todas' }, ...(op.dominios[dom] ?? []).map((i) => ({ value: i.codigo, label: i.rotulo }))];
  const maior = [...d.porCategoria].filter((c) => !c.suprimido && (c.valor ?? 0) > 0).sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))[0];
  const terr = d.porTerritorio.filter((t) => t.tipo === 'regiao');
  const terrB = d.porTerritorio.filter((t) => t.tipo === 'bairro').sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1)).slice(0, 12);
  const atual: Record<string, string> = Object.fromEntries(Object.entries(q).filter(([, v]) => v) as Array<[string, string]>);
  return (
    <Pagina titulo="Dashboard" descricao="Indicadores dos registros aprovados. Cada unidade de contagem é uma medida distinta e nunca é somada às demais.">
      <Banner tipo={d.restrito ? 'info' : 'alerta'} titulo={d.restrito ? 'Regras de privacidade aplicadas' : 'Uso interno — sem supressão'}>
        {d.notas[0]}
      </Banner>
      <form method="get" className="omv-filtros">
        <SelectField name="unidade" label="Unidade de contagem" defaultValue={d.unidade} options={d.unidades.map((x) => ({ value: x.codigo, label: x.rotulo }))} />
        <SelectField name="periodo" label="Período" defaultValue={d.periodo} options={d.periodos.map((p) => ({ value: p, label: rotP(p) }))} />
        {irrestrito ? (
          <>
            <SelectField name="entidade" label="Entidade" defaultValue={q.entidade ?? ''} options={[{ value: '', label: 'Todas' }, ...op.entidades]} />
            <SelectField name="regiao" label="Região" defaultValue={q.regiao ?? ''} options={[{ value: '', label: 'Todas' }, ...op.regioes]} />
            <SelectField name="bairro" label="Bairro" defaultValue={q.bairro ?? ''} options={[{ value: '', label: 'Todos' }, ...op.bairros]} />
            <SelectField name="categoria" label="Categoria" defaultValue={q.categoria ?? ''} options={opcoes('categoria_violencia')} />
            <SelectField name="faixa" label="Faixa etária" defaultValue={q.faixa ?? ''} options={opcoes('faixa_etaria')} />
            <SelectField name="tipo" label="Tipo de registro" defaultValue={q.tipo ?? ''} options={opcoes('tipo_registro')} />
          </>
        ) : null}
        <Button type="submit" icon="filtrar">Aplicar</Button>
      </form>

      {!d.disponivel ? (
        <div className="omv-painel">
          <EmptyState titulo={d.mensagem ?? 'Ainda não há registros aprovados'} icon="indicadores">
            Os indicadores aparecem quando houver registros aprovados na base analítica.
          </EmptyState>
        </div>
      ) : (
        <>
          <section aria-labelledby="kpis-est">
            <h2 id="kpis-est" className="omv-sobrelinha" style={{ marginBottom: 12 }}>Indicadores estatísticos</h2>
            <div className="omv-grid omv-grid-3">
              <StatCard icon="indicadores" label={`${unidadeRotulo} — ${d.periodoRotulo}`} value={d.total.suprimido ? 'suprimido' : fmtNumero(d.total.valor ?? 0)} note={d.total.suprimido ? 'Valor protegido por supressão' : undefined} />
              {d.comparacao ? (
                <StatCard icon="calendario" label={`Variação vs. ${d.comparacao.anteriorRotulo}`} value={d.comparacao.variacaoPct === null ? '—' : `${d.comparacao.variacaoPct > 0 ? '+' : ''}${d.comparacao.variacaoPct.toFixed(1).replace('.', ',')}%`} note={d.comparacao.variacaoPct === null ? 'Sem base de comparação confiável' : `Anterior: ${fmtNumero(d.comparacao.anterior ?? 0)}`} />
              ) : null}
              <StatCard icon="orgao" label="Entidades com envio no período" value={fmtNumero(d.cobertura.entidades)} note={d.cobertura.entidadesAnterior !== null ? `Período anterior: ${d.cobertura.entidadesAnterior}` : undefined} />
              {maior ? <StatCard icon="alerta" label="Categoria mais frequente" value={maior.rotulo} note={`${fmtNumero(maior.valor ?? 0)} ${unidadeRotulo.toLowerCase()}`} /> : null}
            </div>
          </section>
          {d.comparacao?.alerta ? <Banner tipo="alerta" titulo="Variação a interpretar com contexto">{d.comparacao.alerta}</Banner> : null}
          {adm ? (
            <section aria-labelledby="kpis-adm">
              <h2 id="kpis-adm" className="omv-sobrelinha" style={{ marginBottom: 12 }}>Indicadores administrativos (fluxo de envios)</h2>
              <div className="omv-grid omv-grid-3">
                <StatCard icon="em-analise" label="Aguardando análise" value={fmtNumero(adm.aguardando)} />
                <StatCard icon="editar" label="Em análise" value={fmtNumero(adm.emAnalise)} />
                <StatCard icon="alerta" label="Pendentes de correção" value={fmtNumero(adm.pendentesCorrecao)} />
              </div>
            </section>
          ) : null}
          <div className="omv-grid omv-grid-2">
            <GraficoBarras titulo="Série mensal" horizontal={false} dados={d.serie.map((s) => ({ rotulo: s.rotulo, valor: s.valor, suprimido: s.suprimido }))} periodo="Meses com registros" unidade={unidadeRotulo} fonte={fonte} />
            <GraficoBarras titulo="Por categoria de violência" dados={d.porCategoria} periodo={d.periodoRotulo} unidade={unidadeRotulo} fonte={fonte} cor="var(--viz-2)" />
            <GraficoBarras titulo="Por faixa etária" dados={d.porFaixa} periodo={d.periodoRotulo} unidade={unidadeRotulo} fonte={fonte} cor="var(--viz-3)" />
            <GraficoBarras titulo="Por tipo de registro" dados={d.porTipo} periodo={d.periodoRotulo} unidade={unidadeRotulo} fonte={fonte} cor="var(--viz-4)" />
            <GraficoBarras titulo="Por região" dados={terr} periodo={d.periodoRotulo} unidade={unidadeRotulo} fonte={fonte} />
            <GraficoBarras titulo="Por território (maiores valores)" dados={terrB} periodo={d.periodoRotulo} unidade={unidadeRotulo} fonte={fonte} cor="var(--viz-2)" />
          </div>
          <ul className="omv-legenda" style={{ margin: 0, paddingLeft: 18 }}>
            {d.notas.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
      <Visoes salvas={salvas.map((s) => ({ id: s.id, nome: s.nome, filtros: s.filtros as Record<string, string> }))} atual={atual} />
    </Pagina>
  );
}
