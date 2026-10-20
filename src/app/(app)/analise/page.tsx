import { EmptyState, Pagina, SelectField, StatCard, StatusBadge, Table, TextField, Button } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtData, fmtDataHora, fmtNumero } from '@/lib/formato';
import { filaAnalise, metricasAnalise } from '@/server/analise';
import { listarEntidades } from '@/server/admin';
import { ROTULOS_STATUS } from '@/components/ds/StatusBadge';

export const metadata = { title: 'Fila de análise' };

function horas(h: number | null) {
  if (h === null) return '—';
  if (h < 48) return `${h.toFixed(1).replace('.', ',')} h`;
  return `${(h / 24).toFixed(1).replace('.', ',')} dias`;
}

export default async function Fila({ searchParams }: { searchParams: Promise<{ status?: string; entidade?: string; busca?: string; restrita?: string }> }) {
  const u = await requirePermission('analise:ler');
  const q = await searchParams;
  const [m, lista, ents] = await Promise.all([
    metricasAnalise(u),
    filaAnalise(u, { status: q.status, entidadeId: q.entidade, busca: q.busca, restrita: q.restrita === '1' }),
    u.permissoes.has('entidades:gerenciar') ? listarEntidades(u) : Promise.resolve([]),
  ]);
  return (
    <Pagina titulo="Fila de análise" descricao="Revise os envios recebidos. Importações e formulários seguem o mesmo fluxo e nada é aprovado automaticamente.">
      <div className="omv-grid omv-grid-3">
        <StatCard icon="em-analise" label="Aguardando análise" value={fmtNumero(m.aguardando)} note={`Espera média: ${horas(m.horasMediaEspera)}`} />
        <StatCard icon="editar" label="Em análise" value={fmtNumero(m.emAnalise)} />
        <StatCard icon="alerta" label="Pendentes de correção" value={fmtNumero(m.pendentesCorrecao)} />
        <StatCard icon="escudo" label="Restritos (possível dado pessoal)" value={fmtNumero(m.restritos)} />
        <StatCard icon="confirmar" label="Aprovados" value={fmtNumero(m.aprovados)} />
        <StatCard icon="relogio" label="Tempo médio até a decisão" value={horas(m.horasMediaDecisao)} note="Últimos 90 dias" />
      </div>
      <form method="get" className="omv-linha" style={{ alignItems: 'flex-end' }}>
        <TextField name="busca" label="Protocolo" defaultValue={q.busca} placeholder="OMV-2026-…" />
        <SelectField name="status" label="Situação" defaultValue={q.status ?? ''} options={[{ value: '', label: 'Todas' }, ...Object.entries(ROTULOS_STATUS).filter(([k]) => !['rascunho', 'enviado', 'publicado', 'arquivado', 'restrito'].includes(k)).map(([value, label]) => ({ value, label }))]} />
        {ents.length ? <SelectField name="entidade" label="Entidade" defaultValue={q.entidade ?? ''} options={[{ value: '', label: 'Todas' }, ...ents.map((e) => ({ value: e.id, label: e.nome }))]} /> : null}
        <label className="omv-check" style={{ paddingBottom: 10 }}>
          <input type="checkbox" name="restrita" value="1" defaultChecked={q.restrita === '1'} /> Somente restritos
        </label>
        <Button type="submit" variant="secondary" icon="filtrar">Filtrar</Button>
      </form>
      {lista.length === 0 ? (
        <div className="omv-painel">
          <EmptyState titulo="Nenhum envio encontrado" icon="em-analise">Ajuste os filtros ou aguarde novos envios das entidades.</EmptyState>
        </div>
      ) : (
        <Table legenda="Envios para análise">
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Entidade</th>
              <th>Período</th>
              <th>Origem</th>
              <th>Situação</th>
              <th>Pendências</th>
              <th>Recebido em</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id}>
                <td>{e.protocolo}</td>
                <td>{e.entidade}</td>
                <td>{e.periodoInicio ? `${fmtData(e.periodoInicio)} a ${fmtData(e.periodoFim!)}` : '—'}</td>
                <td>{e.tipoEntrada === 'formulario' ? 'Formulário' : e.tipoEntrada.toUpperCase()}</td>
                <td>
                  <StatusBadge status={e.status} />
                  {e.restrita ? <> <StatusBadge status="restrito" /></> : null}
                </td>
                <td>{e.pendenciasAbertas}</td>
                <td>{e.enviadoEm ? fmtDataHora(e.enviadoEm) : '—'}</td>
                <td>
                  <a href={`/analise/${e.id}`}>Analisar</a>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Pagina>
  );
}
