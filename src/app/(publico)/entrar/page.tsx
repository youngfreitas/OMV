import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/AuthCard';
import { pendenciaDeAcesso, usuarioDaSessao } from '@/lib/auth/guards';
import { FormLogin } from './FormLogin';

export const metadata = { title: 'Entrar' };
export const dynamic = 'force-dynamic';

export default async function Entrar() {
  const u = await usuarioDaSessao();
  if (u) redirect(pendenciaDeAcesso(u) ?? '/painel');
  return (
    <AuthCard titulo="Acesso das entidades e da equipe" descricao="Use o e-mail cadastrado pela Secretaria. O acesso é pessoal e intransferível.">
      <FormLogin />
    </AuthCard>
  );
}
