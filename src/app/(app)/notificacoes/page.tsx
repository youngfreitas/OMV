import { EmptyState, Pagina } from '@/components/ds';
import { requireUser } from '@/lib/auth/guards';
import { fmtDataHora } from '@/lib/formato';
import { listarNotificacoes, marcarTodasLidas } from '@/server/notificacoes';

export const metadata = { title: 'Notificações' };

export default async function Notificacoes() {
  const u = await requireUser();
  const lista = await listarNotificacoes(u.id);
  const naoLidas = lista.filter((n) => !n.lidaEm).map((n) => n.id);
  // Ao abrir a página, as notificações são consideradas vistas (a exibição abaixo ainda destaca as novas).
  if (naoLidas.length) await marcarTodasLidas(u.id);
  return (
    <Pagina titulo="Notificações" descricao="Avisos sobre envios. Nunca incluem o conteúdo dos dados enviados.">
      {lista.length === 0 ? (
        <div className="omv-painel">
          <EmptyState titulo="Você não tem notificações" icon="notificacoes" />
        </div>
      ) : (
        <ul className="omv-painel" style={{ listStyle: 'none', margin: 0, display: 'grid', gap: 16 }}>
          {lista.map((n) => (
            <li key={n.id} style={{ borderBottom: '1px solid var(--linha)', paddingBottom: 12 }}>
              <strong>{naoLidas.includes(n.id) ? '● ' : ''}{n.titulo}</strong>
              {n.texto ? <div className="omv-muted">{n.texto}</div> : null}
              <div className="omv-legenda">
                {fmtDataHora(n.criadoEm)} {n.link ? <>· <a href={n.link}>Abrir</a></> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}
