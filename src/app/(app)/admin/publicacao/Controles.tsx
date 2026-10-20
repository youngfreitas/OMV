'use client';

import { useState, useTransition } from 'react';
import { Button, Modal, TextArea, useToast } from '@/components/ds';
import { gerarAcao, publicarAcao, retirarAcao } from './acoes';

export function ControlesPublicacao() {
  const [pendente, iniciar] = useTransition();
  const toast = useToast();
  return (
    <div className="omv-linha">
      <p className="omv-muted" style={{ margin: 0, maxWidth: '60ch' }}>
        A geração agrega os registros aprovados ativos, aplica as supressões e cria uma versão para conferência. A publicação é um passo separado.
      </p>
      <Button
        icon="publicar"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await gerarAcao();
            if (r.ok) {
              toast('ok', `Publicação v${r.versao} gerada.`);
              window.location.reload();
            } else toast('erro', r.erro);
          })
        }
      >
        Gerar publicação
      </Button>
    </div>
  );
}

export function LinhaAcoesPublicacao({ id, status, podePublicar, podeRetirar }: { id: string; status: string; podePublicar: boolean; podeRetirar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [motivo, setMotivo] = useState('');
  const [aberto, setAberto] = useState(false);
  const toast = useToast();
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) =>
    iniciar(async () => {
      const r = await fn();
      if (r.ok) window.location.reload();
      else toast('erro', r.erro ?? 'Erro.');
    });
  return (
    <div className="omv-linha">
      {status === 'rascunho' && podePublicar ? (
        <Button size="sm" disabled={pendente} onClick={() => rodar(() => publicarAcao(id))}>Publicar</Button>
      ) : null}
      {status === 'publicada' && podeRetirar ? (
        <>
          <Button size="sm" variant="danger" onClick={() => setAberto(true)}>Retirar do ar</Button>
          <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Retirar publicação" rodape={<><Button variant="secondary" onClick={() => setAberto(false)}>Cancelar</Button><Button variant="danger" disabled={pendente} onClick={() => rodar(() => retirarAcao(id, motivo))}>Retirar</Button></>}>
            <p>O portal público deixará de exibir indicadores até que uma nova publicação seja feita.</p>
            <TextArea label="Motivo (obrigatório)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Modal>
        </>
      ) : null}
    </div>
  );
}
