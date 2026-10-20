import { Cartao, Pagina, StatusBadge, Table } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { PAPEIS_PADRAO } from '@/lib/auth/permissoes';
import { fmtDataHora } from '@/lib/formato';
import { listarEntidades, listarUsuarios } from '@/server/admin';
import { AcoesUsuario, FormUsuario } from './Controles';

export const metadata = { title: 'Usuários' };

export default async function PaginaUsuarios() {
  const u = await requirePermission('usuarios:gerenciar');
  const [lista, entidades] = await Promise.all([listarUsuarios(u), listarEntidades(u)]);
  return (
    <Pagina titulo="Usuários" descricao="Contas pessoais da equipe e das entidades. Administradores, gestores e analistas exigem verificação em duas etapas.">
      <Cartao titulo="Novo usuário">
        <FormUsuario entidades={entidades.filter((e) => e.ativo).map((e) => ({ value: e.id, label: e.nome }))} />
      </Cartao>
      <Table legenda="Usuários cadastrados">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Perfil</th>
            <th>Entidade</th>
            <th>MFA</th>
            <th>Último acesso</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((x) => (
            <tr key={x.id}>
              <td>
                {x.nome}
                <br />
                <span className="omv-legenda">{x.email}</span>
              </td>
              <td>{x.papeis.map((p) => PAPEIS_PADRAO[p as keyof typeof PAPEIS_PADRAO]?.nome ?? p).join(', ')}</td>
              <td>{x.entidade ?? '—'}</td>
              <td>{x.mfaAtivo ? 'Ativa' : 'Não'}</td>
              <td>{x.ultimoAcesso ? fmtDataHora(x.ultimoAcesso) : '—'}</td>
              <td>
                <StatusBadge status={x.ativo ? 'aprovado' : 'arquivado'}>{x.ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
              </td>
              <td>
                <AcoesUsuario id={x.id} ativo={x.ativo} proprio={x.id === u.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Pagina>
  );
}
