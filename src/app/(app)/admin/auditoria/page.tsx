import { Pagina, Table, TextField, Button } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtDataHora } from '@/lib/formato';
import { consultarAuditoria } from '@/server/admin';

export const metadata = { title: 'Auditoria' };

export default async function PaginaAuditoria({ searchParams }: { searchParams: Promise<{ acao?: string; usuario?: string; pagina?: string }> }) {
  const u = await requirePermission('auditoria:ler');
  const q = await searchParams;
  const r = await consultarAuditoria(u, { acao: q.acao, usuario: q.usuario, pagina: Number(q.pagina) || 1 });
  const paginas = Math.max(1, Math.ceil(r.total / r.porPagina));
  const link = (p: number) => `?${new URLSearchParams({ ...(q.acao ? { acao: q.acao } : {}), ...(q.usuario ? { usuario: q.usuario } : {}), pagina: String(p) })}`;
  return (
    <Pagina titulo="Auditoria" descricao="Trilha somente de inserção: nenhum registro pode ser alterado ou apagado. Não contém conteúdo de envios.">
      <form className="omv-linha" method="get">
        <TextField name="acao" label="Ação (início)" defaultValue={q.acao} placeholder="ex.: login" />
        <TextField name="usuario" label="Usuário (e-mail)" defaultValue={q.usuario} />
        <div style={{ alignSelf: 'flex-end' }}>
          <Button type="submit" variant="secondary" icon="filtrar">Filtrar</Button>
        </div>
      </form>
      <Table legenda="Eventos de auditoria">
        <thead>
          <tr>
            <th>Quando</th>
            <th>Ação</th>
            <th>Usuário</th>
            <th>Recurso</th>
            <th>IP</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {r.linhas.map((l) => (
            <tr key={l.id}>
              <td>{fmtDataHora(l.quando)}</td>
              <td>
                <code>{l.acao}</code>
              </td>
              <td>{l.usuario ?? '—'}</td>
              <td>{l.recursoTipo ? `${l.recursoTipo} ${(l.recursoId ?? '').slice(0, 8)}` : '—'}</td>
              <td>{l.ip}</td>
              <td className="omv-legenda">{l.detalhes ? JSON.stringify(l.detalhes) : ''}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="omv-linha">
        <span className="omv-legenda">
          Página {r.pagina} de {paginas} · {r.total} eventos
        </span>
        {r.pagina > 1 ? <a href={link(r.pagina - 1)}>Anterior</a> : null}
        {r.pagina < paginas ? <a href={link(r.pagina + 1)}>Próxima</a> : null}
      </div>
    </Pagina>
  );
}
