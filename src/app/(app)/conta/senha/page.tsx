import { Banner, Pagina } from '@/components/ds';
import { requireUser } from '@/lib/auth/guards';
import { FormSenha } from './FormSenha';

export const metadata = { title: 'Alterar senha' };

export default async function PaginaSenha({ searchParams }: { searchParams: Promise<{ forcada?: string }> }) {
  await requireUser({ permitirPendente: true });
  const { forcada } = await searchParams;
  return (
    <Pagina titulo="Alterar senha">
      {forcada ? <Banner tipo="alerta" titulo="Troca obrigatória">Defina uma nova senha para continuar usando o sistema.</Banner> : null}
      <div className="omv-painel" style={{ maxWidth: 480 }}>
        <FormSenha />
      </div>
    </Pagina>
  );
}
