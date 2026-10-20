import { AuthCard } from '@/components/AuthCard';
import { FormSolicitar } from './FormSolicitar';

export const metadata = { title: 'Recuperar senha' };

export default function Recuperar() {
  return (
    <AuthCard titulo="Recuperar senha" descricao="Informe o e-mail cadastrado para receber o link de redefinição.">
      <FormSolicitar />
    </AuthCard>
  );
}
