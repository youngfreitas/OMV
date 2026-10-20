import type { ReactNode } from 'react';
import { AppHeader, Sidebar, type ItemNav } from '@/components/ds';
import { FaixaDemo } from '@/components/ds/FaixaDemo';
import { MenuMovel } from '@/components/MenuMovel';
import { requireUser, temPermissao } from '@/lib/auth/guards';
import { modoDemo } from '@/lib/demo/modo';
import { contarNaoLidas } from '@/server/notificacoes';
import { sairAcao } from './acoes';

export const dynamic = 'force-dynamic';

function iniciais(nome: string) {
  const p = nome.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

export default async function LayoutApp({ children }: { children: ReactNode }) {
  // Páginas de conta (troca de senha/MFA) também usam este layout e precisam funcionar com pendência.
  const u = await requireUser({ permitirPendente: true });
  const naoLidas = await contarNaoLidas(u.id);
  const tem = (p: Parameters<typeof temPermissao>[1]) => temPermissao(u, p);

  const secoes: Array<{ title?: string; items: ItemNav[] }> = [
    { items: [{ label: 'Início', href: '/painel', icon: 'inicio' }] },
  ];
  const entidade: ItemNav[] = [];
  if (tem('submissao:criar')) {
    entidade.push(
      { label: 'Novo envio', href: '/entidade/novo', icon: 'mais' },
      { label: 'Importar arquivo', href: '/entidade/importar', icon: 'subir' },
    );
  }
  if (tem('submissao:ler_proprias')) entidade.push({ label: 'Meus envios', href: '/entidade/envios', icon: 'ocorrencias' });
  if (tem('submissao:criar')) entidade.push({ label: 'Modelos de preenchimento', href: '/entidade/modelos', icon: 'baixar' });
  if (entidade.length) secoes.push({ title: 'Entidade', items: entidade });

  if (tem('analise:ler')) secoes.push({ title: 'Análise', items: [{ label: 'Fila de análise', href: '/analise', icon: 'em-analise' }] });

  const dados: ItemNav[] = [];
  if (tem('dados:ver_agregado')) dados.push({ label: 'Dashboard', href: '/dashboard', icon: 'indicadores' });
  if (tem('monitoramento:ler')) dados.push({ label: 'Monitoramento', href: '/monitoramento', icon: 'tabela' });
  if (tem('relatorio:gerar')) dados.push({ label: 'Relatórios', href: '/relatorios', icon: 'relatorios' });
  if (dados.length) secoes.push({ title: 'Dados', items: dados });

  const admin: ItemNav[] = [];
  if (tem('publicacao:ler')) admin.push({ label: 'Publicação', href: '/admin/publicacao', icon: 'publicar' });
  if (tem('entidades:gerenciar')) admin.push({ label: 'Entidades', href: '/admin/entidades', icon: 'orgao' });
  if (tem('usuarios:gerenciar')) admin.push({ label: 'Usuários', href: '/admin/usuarios', icon: 'pessoas' });
  if (tem('cadastros:gerenciar')) admin.push({ label: 'Cadastros', href: '/admin/cadastros', icon: 'arquivar' });
  if (tem('geo:gerenciar')) admin.push({ label: 'Base geográfica', href: '/admin/geo', icon: 'mapa' });
  if (tem('papeis:gerenciar')) admin.push({ label: 'Perfis', href: '/admin/perfis', icon: 'escudo' });
  if (tem('config:metodologia')) admin.push({ label: 'Configurações', href: '/admin/configuracoes', icon: 'ajustes' });
  if (tem('auditoria:ler')) admin.push({ label: 'Auditoria', href: '/admin/auditoria', icon: 'historico' });
  if (admin.length) secoes.push({ title: 'Administração', items: admin });

  secoes.push({
    title: 'Conta',
    items: [
      { label: 'Notificações', href: '/notificacoes', icon: 'notificacoes', count: naoLidas || undefined },
      { label: 'Minha conta', href: '/conta', icon: 'usuario' },
    ],
  });

  return (
    <>
      {modoDemo() ? <FaixaDemo /> : null}
      <div className="omv-shell">
        <MenuMovel
          menu={
            <Sidebar
              sections={secoes}
              footer={
                <form action={sairAcao}>
                  <button type="submit" className="omv-nav-item" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 4h4v16h-4" />
                      <path d="M10 8l-4 4 4 4" />
                      <path d="M6 12h10" />
                    </svg>
                    <span>Sair</span>
                  </button>
                </form>
              }
            />
          }
        >
          <AppHeader userInitials={iniciais(u.nome)} userName={u.nome} notifications={naoLidas} />
          <div className="omv-shell-conteudo" id="conteudo">
            {children}
          </div>
        </MenuMovel>
      </div>
    </>
  );
}
