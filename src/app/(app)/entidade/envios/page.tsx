import { ButtonLink, EmptyState, Pagina, StatusBadge, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { fmtData, fmtDataHora } from '@/lib/formato';
import { listarSubmissoes } from '@/server/submissoes';

export const metadata = { title: 'Meus envios' };

export default async function Envios() {
  const u = await requirePermission('submissao:ler_proprias', 'submissao:ler_todas');
  const lista = await listarSubmissoes(u);
  return (
    <Pagina
      titulo="Meus envios"
      descricao="Acompanhe a situação de cada envio e atenda às pendências solicitadas pela equipe de análise."
      acoes={
        <>
          <ButtonLink href="/entidade/novo" icon="mais">Novo envio</ButtonLink>
          <ButtonLink href="/entidade/importar" icon="subir" variant="secondary">Importar arquivo</ButtonLink>
        </>
      }
    >
      {lista.length === 0 ? (
        <div className="omv-painel">
          <EmptyState titulo="Nenhum envio ainda" icon="ocorrencias">Comece criando um novo envio pelo formulário ou importando um arquivo do modelo.</EmptyState>
        </div>
      ) : (
        <Table legenda="Envios da entidade">
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Período</th>
              <th>Origem</th>
              <th>Situação</th>
              <th>Atualizado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id}>
                <td>{e.protocolo ?? <span className="omv-muted">rascunho</span>}</td>
                <td>{e.periodoInicio ? `${fmtData(e.periodoInicio)} a ${fmtData(e.periodoFim!)}` : '—'}</td>
                <td>{e.tipoEntrada === 'formulario' ? 'Formulário' : e.tipoEntrada.toUpperCase()}</td>
                <td>
                  <StatusBadge status={e.status} />
                  {e.restrita ? <> <StatusBadge status="restrito" /></> : null}
                </td>
                <td>{fmtDataHora(e.atualizadoEm)}</td>
                <td>
                  <a href={`/entidade/envios/${e.id}`}>Abrir</a>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Pagina>
  );
}
