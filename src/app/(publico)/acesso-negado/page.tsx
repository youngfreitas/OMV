import { AuthCard } from '@/components/AuthCard';
import { ButtonLink } from '@/components/ds';

export const metadata = { title: 'Acesso não permitido' };

export default function AcessoNegado() {
  return (
    <AuthCard titulo="Acesso não permitido" descricao="Seu perfil não tem permissão para abrir esta página. Se você acredita que deveria ter acesso, fale com a administração do OMV.">
      <ButtonLink href="/painel" variant="secondary">
        Voltar ao painel
      </ButtonLink>
    </AuthCard>
  );
}
