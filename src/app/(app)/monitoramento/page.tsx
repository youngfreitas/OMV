import { Banner, Button, EmptyState, Pagina, SelectField, StatusBadge, TextField } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtNumero } from '@/lib/formato';
import { carregarDominios } from '@/server/cadastros';
import { monitoramento, type FiltrosMonitor } from '@/server/dados';
import { TabelaMonitor } from './TabelaMonitor';

export const metadata = { title: 'Monitoramento' };

export default async function Monitor({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requirePermission('monitoramento:ler');
  const q = await searchParams;
  const f: FiltrosMonitor = {
    busca: q.busca, periodo: q.periodo, unidade: q.unidade, categoria: q.categoria, faixa: q.faixa,
    situacao: (q.situacao as FiltrosMonitor['situacao']) ?? 'ativos', ordem: q.ordem, dir: q.dir === 'asc' ? 'asc' : 'desc',
    pagina: Number(q.pagina) || 1, porPagina: Number(q.por) || 25,
  };
  const [r, dom] = await Promise.all([monitoramento(u, f), carregarDominios()]);
  const paginas = Math.max(1, Math.ceil(r.total / r.porPagina));
  const link = (extra: Record<string, string>) => `?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(q).filter(([, v]) => v)) as Record<string, string>), ...extra })}`;
  const opt = (d: string, todas = 'Todas') => [{ value: '', label: todas }, ...(dom[d] ?? []).map((i) => ({ value: i.codigo, label: i.rotulo }))];
  return (
    <Pagina titulo="Monitoramento" descricao="Registros aprovados da base analítica. Cada linha é um registro agregado — nunca uma pessoa.">
      {!r.irrestrito ? <Banner tipo="info" titulo="Contagens pequenas ocultas">Valores menores que {r.k} aparecem como “&lt; {r.k}”, pelas regras de privacidade do seu perfil.</Banner> : null}
      <form method="get" className="omv-filtros">
        <TextField name="busca" label="Buscar" defaultValue={q.busca} placeholder="bairro, entidade, categoria ou período" />
        <TextField name="periodo" label="Período" defaultValue={q.periodo} placeholder="2026-03 ou 2026" />
        <SelectField name="unidade" label="Unidade" defaultValue={q.unidade ?? ''} options={opt('unidade_contagem')} />
        <SelectField name="categoria" label="Categoria" defaultValue={q.categoria ?? ''} options={opt('categoria_violencia')} />
        <SelectField name="faixa" label="Faixa etária" defaultValue={q.faixa ?? ''} options={opt('faixa_etaria')} />
        <SelectField name="situacao" label="Situação" defaultValue={f.situacao} options={[{ value: 'ativos', label: 'Ativos' }, { value: 'retirados', label: 'Retirados' }, { value: 'todos', label: 'Todos' }]} />
        <SelectField name="por" label="Linhas por página" defaultValue={String(r.porPagina)} options={['25', '50', '100']} />
        <Button type="submit" icon="filtrar">Filtrar</Button>
      </form>
      {r.linhas.length === 0 ? (
        <div className="omv-painel"><EmptyState titulo="Nenhum registro encontrado" icon="tabela">Ajuste os filtros ou aguarde a aprovação de envios.</EmptyState></div>
      ) : (
        <TabelaMonitor
          k={r.k}
          ordem={f.ordem ?? 'periodo'}
          dir={f.dir ?? 'desc'}
          linkOrdem={Object.fromEntries(['periodo', 'quantidade', 'categoria', 'unidade'].map((c) => [c, link({ ordem: c, dir: f.ordem === c && f.dir === 'desc' ? 'asc' : 'desc', pagina: '1' })]))}
          linhas={r.linhas.map((l) => ({ ...l }))}
          podeEtiquetar={u.permissoes.has('analise:comentar')}
        />
      )}
      <div className="omv-linha">
        <span className="omv-legenda">{fmtNumero(r.total)} registro(s) · página {r.pagina} de {paginas}</span>
        {r.pagina > 1 ? <a href={link({ pagina: String(r.pagina - 1) })}>Anterior</a> : null}
        {r.pagina < paginas ? <a href={link({ pagina: String(r.pagina + 1) })}>Próxima</a> : null}
        <StatusBadge status="rascunho">Somente leitura</StatusBadge>
      </div>
    </Pagina>
  );
}
