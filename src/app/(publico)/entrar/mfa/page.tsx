import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/AuthCard';
import { pendenciaDeAcesso, usuarioDaSessao } from '@/lib/auth/guards';
import { FormMfa } from './FormMfa';

export const metadata = { title: 'Verificação em duas etapas' };
export const dynamic = 'force-dynamic';

export default async function Mfa() {
  const u = await usuarioDaSessao();
  if (!u) redirect('/entrar');
  const p = pendenciaDeAcesso(u);
  if (p !== '/entrar/mfa') redirect(p ?? '/painel');
  return (
    <AuthCard titulo="Verificação em duas etapas" descricao="Digite o código do aplicativo autenticador.">
      <FormMfa />
    </AuthCard>
  );
}
