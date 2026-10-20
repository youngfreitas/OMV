import { Cartao, LinkCard, Pagina } from '@/components/ds';
import { requireUser } from '@/lib/auth/guards';

export const metadata = { title: 'Minha conta' };

export default async function Conta() {
  const u = await requireUser({ permitirPendente: true });
  return (
    <Pagina titulo="Minha conta">
      <Cartao titulo="Dados da conta">
        <p style={{ margin: 0 }}>
          <strong>{u.nome}</strong>
          <br />
          <span className="omv-muted">{u.email}</span>
        </p>
        <p className="omv-legenda">Perfil: {u.papeis.join(', ')}</p>
      </Cartao>
      <div className="omv-grid omv-grid-2">
        <LinkCard href="/conta/senha" icon="cadeado" label="Alterar senha" />
        <LinkCard
          href="/conta/mfa"
          icon="escudo"
          label="Verificação em duas etapas"
          description={u.mfaAtivo ? 'Ativada' : 'Não configurada'}
        />
      </div>
    </Pagina>
  );
}
