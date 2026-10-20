'use client';

import { useState, useTransition } from 'react';
import { Banner, Button, useToast } from '@/components/ds';
import { DECLARACAO_SEM_DADOS_PESSOAIS } from '@/lib/dicionario/campos';
import { descartarAcao, enviarAcao, reenviarAcao } from '../../acoes';

export function AcoesEnvio({ id, status }: { id: string; status: string }) {
  const [decl, setDecl] = useState(false);
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  if (status !== 'rascunho' && status !== 'pendente_correcao') return null;
  const reenvio = status === 'pendente_correcao';
  return (
    <Banner tipo="info" titulo={reenvio ? 'Pronto para reenviar?' : 'Rascunho aguardando sua confirmação'}>
      <label className="omv-check" style={{ margin: '8px 0' }}>
        <input type="checkbox" checked={decl} onChange={(e) => setDecl(e.target.checked)} />
        <span>{DECLARACAO_SEM_DADOS_PESSOAIS}</span>
      </label>
      <div className="omv-linha">
        <Button
          icon="enviar"
          disabled={pendente || !decl}
          onClick={() =>
            iniciar(async () => {
              const r = reenvio ? await reenviarAcao(id, decl) : await enviarAcao(id, decl);
              if (r.ok) window.location.reload();
              else toast('erro', r.erro);
            })
          }
        >
          {reenvio ? 'Reenviar' : 'Confirmar e enviar'}
        </Button>
        {!reenvio ? (
          <Button
            variant="danger"
            icon="lixeira"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await descartarAcao(id);
                if (r.ok) window.location.href = '/entidade/envios';
                else toast('erro', r.erro);
              })
            }
          >
            Descartar rascunho
          </Button>
        ) : null}
      </div>
    </Banner>
  );
}
