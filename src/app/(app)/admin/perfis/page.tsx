import { Banner, Pagina } from '@/components/ds';
import { requirePermission } from '@/lib/auth/guards';
import { PERMISSOES } from '@/lib/auth/permissoes';
import { matrizPerfis } from '@/server/admin';
import { MatrizPerfis } from './MatrizPerfis';

export const metadata = { title: 'Perfis e permissões' };

export default async function PaginaPerfis() {
  const u = await requirePermission('papeis:gerenciar');
  const m = await matrizPerfis(u);
  return (
    <Pagina titulo="Perfis e permissões" descricao="Cada perfil reúne permissões granulares. O escopo por entidade é sempre aplicado, independentemente da permissão.">
      <Banner tipo="info">Alterações valem a partir do próximo carregamento de página de cada usuário e ficam registradas na auditoria.</Banner>
      <MatrizPerfis
        papeis={m.papeis.map((p) => ({ id: p.id, nome: p.nome, codigo: p.codigo, permissoes: p.permissoes }))}
        permissoes={m.permissoes.map((p) => ({ codigo: p.codigo, descricao: PERMISSOES[p.codigo as keyof typeof PERMISSOES] ?? p.descricao }))}
      />
    </Pagina>
  );
}
