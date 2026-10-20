import { Cartao, Pagina, StatusBadge, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { TIPOS_ENTIDADE, listarEntidades } from '@/server/admin';
import { FormEntidade, BotaoAlternar } from './Controles';

export const metadata = { title: 'Entidades' };

export default async function PaginaEntidades() {
  const u = await requirePermission('entidades:gerenciar');
  const lista = await listarEntidades(u);
  const tipo = (t: string) => TIPOS_ENTIDADE.find((x) => x.value === t)?.label ?? t;
  return (
    <Pagina titulo="Entidades" descricao="Órgãos e organizações da rede que enviam dados agregados ao OMV.">
      <Cartao titulo="Nova entidade">
        <FormEntidade tipos={TIPOS_ENTIDADE} />
      </Cartao>
      <Table legenda="Entidades cadastradas">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => (
            <tr key={e.id}>
              <td>{e.nome}</td>
              <td>{tipo(e.tipo)}</td>
              <td>
                <StatusBadge status={e.ativo ? 'aprovado' : 'arquivado'}>{e.ativo ? 'Ativa' : 'Inativa'}</StatusBadge>
              </td>
              <td>
                <BotaoAlternar id={e.id} ativo={e.ativo} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Pagina>
  );
}
