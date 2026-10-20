import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/plus-jakarta-sans';
import '@/styles/tokens.css';
import '@/styles/ds.css';
import '@/styles/app.css';
import { SCRIPT_TEMA } from '@/components/ds';
import { ToastProvider } from '@/components/ds/Toast';
import { VERSAO_APP } from '@/lib/versao';

export const metadata: Metadata = {
  title: { default: 'OMV — Observatório Municipal de Violência', template: '%s · OMV Ubatuba' },
  description:
    'Monitoramento agregado da violência doméstica contra mulheres em Ubatuba, com indicadores públicos protegidos por regras de privacidade.',
  icons: { icon: '/marca/omv-simbolo-cor.svg' },
  other: { 'omv-versao': VERSAO_APP },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F4F9' },
    { media: '(prefers-color-scheme: dark)', color: '#150B20' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <a className="omv-pular" href="#conteudo">
          Pular para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
