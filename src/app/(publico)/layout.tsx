import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ds';
import { ButtonLink } from '@/components/ds/Button';
import { FaixaDemo } from '@/components/ds/FaixaDemo';
import { modoDemo } from '@/lib/demo/modo';
import { VERSAO_APP } from '@/lib/versao';

export default function LayoutPublico({ children }: { children: ReactNode }) {
  return (
    <>
      {modoDemo() ? <FaixaDemo /> : null}
      <header className="pub-header">
        <a href="/" className="pub-logo" aria-label="OMV — Observatório Municipal de Violência — página inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="omv-only-light" src="/marca/omv-horizontal-cor.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="omv-only-dark" src="/marca/omv-horizontal-negativo.svg" alt="" />
        </a>
        <nav className="pub-nav" aria-label="Navegação pública">
          <a href="/#sobre">Sobre</a>
          <a href="/#como-funciona">Como funciona</a>
          <a href="/mapa">Mapa</a>
          <a href="/#privacidade">Privacidade e metodologia</a>
        </nav>
        <div className="pub-header-acoes">
          <ThemeToggle />
          <ButtonLink href="/entrar" variant="secondary" size="sm" icon="usuario">
            Entrar
          </ButtonLink>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer className="pub-footer">
        <div className="pub-footer-grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="omv-only-light" src="/marca/omv-horizontal-cor.svg" alt="OMV — Observatório Municipal de Violência" height={44} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="omv-only-dark" src="/marca/omv-horizontal-negativo.svg" alt="OMV — Observatório Municipal de Violência" height={44} />
            <p className="omv-legenda" style={{ marginTop: 12 }}>
              Prefeitura Municipal de Ubatuba · Secretaria Municipal de Defesa dos Direitos da Mulher e da Pessoa com Deficiência.
            </p>
          </div>
          <div>
            <p className="omv-sobrelinha">Contato</p>
            <p className="omv-legenda">Endereço, telefone e e-mail oficiais: a confirmar pela Secretaria.</p>
          </div>
          <div>
            <p className="omv-sobrelinha">Em caso de violência</p>
            <p className="omv-legenda">
              Ligue 180 (Central de Atendimento à Mulher) ou 190 em situação de emergência.
            </p>
          </div>
        </div>
        <p className="omv-legenda pub-footer-base">
          Este portal exibe somente dados agregados, sem identificação de pessoas. Versão {VERSAO_APP}.
        </p>
      </footer>
    </>
  );
}
