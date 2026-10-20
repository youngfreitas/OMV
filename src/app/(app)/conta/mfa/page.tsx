import { Banner, Pagina } from '@/components/ds';
import { requireUser } from '@/lib/auth/guards';
import { PainelMfa } from './PainelMfa';

export const metadata = { title: 'Verificação em duas etapas' };

export default async function PaginaMfa() {
  const u = await requireUser({ permitirPendente: true });
  return (
    <Pagina titulo="Verificação em duas etapas">
      {u.mfaObrigatorio && !u.mfaAtivo ? (
        <Banner tipo="alerta" titulo="Configuração obrigatória">
          Seu perfil exige a verificação em duas etapas. Configure para liberar o acesso ao sistema.
        </Banner>
      ) : null}
      <div className="omv-painel" style={{ maxWidth: 560 }}>
        <PainelMfa ativo={u.mfaAtivo} />
      </div>
    </Pagina>
  );
}
