import { AuthCard } from '@/components/AuthCard';
import { FormRedefinir } from '../FormRedefinir';

export const metadata = { title: 'Redefinir senha' };

export default async function Redefinir({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthCard titulo="Definir nova senha">
      <FormRedefinir token={token} />
    </AuthCard>
  );
}
