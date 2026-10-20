import { Banner, Button, ButtonLink, Pagina, SelectField, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtMes, fmtNumero } from '@/lib/formato';
import { painelDados } from '@/server/dados';

export const metadata = { title: 'Relatórios' };

const rotP = (p: string) => (p === 'todos' ? 'Todo o período' : /^\d{4}$/.test(p) ? `Ano ${p}` : fmtMes(p));

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ unidade?: string; periodo?: string }> }) {
  const u = await requirePermission('relatorio:gerar');
  const q = await searchParams;
  const p = await painelDados(u, q);
  const exporta = u.permissoes.has('relatorio:exportar');
  const qs = new URLSearchParams({ unidade: p.unidade, periodo: p.periodo });
  const secao = (titulo: string, itens: Array<{ rotulo: string; valor: number | null; suprimido: boolean }>) => (
    <div className="omv-painel">
      <h2>{titulo}</h2>
      <Table legenda={titulo}>
        <thead><tr><th>Categoria</th><th className="num">Valor</th></tr></thead>
        <tbody>{itens.map((i) => <tr key={i.rotulo}><td>{i.rotulo}</td><td className="num">{i.suprimido ? 'suprimido' : fmtNumero(i.valor ?? 0)}</td></tr>)}</tbody>
      </Table>
    </div>
  );
  return (
    <Pagina titulo="Relatórios" descricao="Prévia dos indicadores por unidade e período, com exportação em PDF e XLSX para quem tem permissão.">
      <form method="get" className="omv-filtros">
        <SelectField name="unidade" label="Unidade de contagem" defaultValue={p.unidade} options={p.unidades.map((x) => ({ value: x.codigo, label: x.rotulo }))} />
        <SelectField name="periodo" label="Período" defaultValue={p.periodo} options={p.periodos.map((x) => ({ value: x, label: rotP(x) }))} />
        <Button type="submit" variant="secondary" icon="filtrar">Atualizar prévia</Button>
        {exporta && p.disponivel ? (
          <>
            <ButtonLink href={`/api/relatorios?formato=pdf&${qs}`} icon="baixar">Exportar PDF</ButtonLink>
            <ButtonLink href={`/api/relatorios?formato=xlsx&${qs}`} icon="baixar" variant="secondary">Exportar XLSX</ButtonLink>
          </>
        ) : null}
      </form>
      {!exporta ? <Banner tipo="info">Seu perfil pode visualizar a prévia, mas não exportar arquivos.</Banner> : null}
      {!p.disponivel ? <Banner tipo="info" titulo={p.mensagem ?? 'Sem dados'}>Não há registros aprovados para gerar relatório.</Banner> : (
        <>
          <Banner tipo={p.restrito ? 'info' : 'alerta'} titulo={p.restrito ? 'Valores com supressão estatística' : 'Dados internos sem supressão — não divulgar'}>{p.notas.join(' ')}</Banner>
          <div className="omv-painel"><h2>{p.unidades.find((x) => x.codigo === p.unidade)?.rotulo} — {p.periodoRotulo}</h2><p style={{ fontSize: 28, margin: 0 }}>{p.total.suprimido ? 'suprimido' : fmtNumero(p.total.valor ?? 0)}</p></div>
          {secao('Por categoria de violência', p.porCategoria)}
          {secao('Por faixa etária', p.porFaixa)}
          {secao('Por tipo de registro', p.porTipo)}
          {secao('Por território', p.porTerritorio.map((t) => ({ rotulo: `${t.tipo === 'regiao' ? 'Região' : 'Bairro'}: ${t.rotulo}`, valor: t.valor, suprimido: t.suprimido })))}
        </>
      )}
    </Pagina>
  );
}
