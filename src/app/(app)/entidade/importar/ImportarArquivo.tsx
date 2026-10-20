'use client';

import { useState } from 'react';
import { Banner, Button, ButtonLink, Cartao, Icon } from '@/components/ds';
import { RelatorioView } from '@/components/envio/Relatorio';
import type { ResultadoImportacao } from '@/server/importacao';

const ICONE = { ok: 'confirmar', alerta: 'alerta', erro: 'fechar', pendente: 'relogio' } as const;

export function ImportarArquivo() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [res, setRes] = useState<ResultadoImportacao | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  const enviar = async () => {
    if (!arquivo) return;
    setEnviando(true);
    setFalha(null);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append('arquivo', arquivo);
      const r = await fetch('/api/importacao', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.etapas) setRes(j as ResultadoImportacao);
      else setFalha(j.erro ?? 'Não foi possível processar o arquivo.');
    } catch {
      setFalha('Falha de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="form-pilha" style={{ gap: 24 }}>
      <Cartao titulo="1. Escolha o arquivo">
        <div className="form-pilha">
          <p className="omv-muted" style={{ margin: 0 }}>
            Não tem o modelo? <a href="/entidade/modelos">Baixe o modelo atual</a>. Arquivos com macros, fórmulas, objetos incorporados ou conteúdo suspeito são recusados.
          </p>
          <input
            type="file"
            aria-label="Arquivo para importação"
            accept=".csv,.xlsx,.docx,.md"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="omv-input"
            style={{ height: 'auto', padding: 12 }}
          />
          <div>
            <Button icon="subir" disabled={!arquivo || enviando} onClick={enviar}>
              {enviando ? 'Verificando…' : 'Verificar arquivo'}
            </Button>
          </div>
        </div>
      </Cartao>
      {falha ? <Banner tipo="erro">{falha}</Banner> : null}
      {res ? (
        <>
          <Cartao titulo="2. Etapas da verificação">
            <ol className="etapas-imp">
              {res.etapas.map((e) => (
                <li key={e.n} data-estado={e.estado}>
                  <Icon name={ICONE[e.estado]} size={18} label={e.estado === 'ok' ? 'concluída' : e.estado === 'erro' ? 'com erro' : e.estado === 'alerta' ? 'com alerta' : 'não executada'} />
                  <span>
                    {e.titulo}
                    {e.detalhe ? <span className="omv-legenda" style={{ display: 'block' }}>{e.detalhe}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Cartao>
          {!res.ok ? <Banner tipo="erro" titulo="Arquivo não aceito">{res.erro}</Banner> : null}
          {res.ok ? (
            <Cartao titulo="3. Relatório de validação">
              <RelatorioView r={res.relatorio} />
              <div className="omv-linha" style={{ marginTop: 16 }}>
                <ButtonLink href={`/entidade/envios/${res.id}`} iconRight="seta-direita">
                  Revisar rascunho e confirmar envio
                </ButtonLink>
                {res.relatorio.resumo.erros ? <ButtonLink href={`/entidade/envios/${res.id}/editar`} variant="secondary" icon="editar">Corrigir no formulário</ButtonLink> : null}
              </div>
            </Cartao>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
