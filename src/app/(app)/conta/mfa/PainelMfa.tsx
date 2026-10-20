'use client';

import { useActionState, useState, useTransition } from 'react';
import { Banner, Button, TextField } from '@/components/ds';
import { confirmarMfaAcao, gerarQrAcao, type EstadoMfa } from './acoes';

export function PainelMfa({ ativo }: { ativo: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoMfa, FormData>(confirmarMfaAcao, { etapa: 'inicio' });
  const [qr, setQr] = useState<EstadoMfa | null>(null);
  const [, iniciar] = useTransition();
  const atual = estado.etapa === 'inicio' ? qr : estado;

  if (atual?.etapa === 'pronto') {
    return (
      <div className="form-pilha">
        <Banner tipo="info" titulo="Verificação ativada">
          Guarde os códigos de recuperação em local seguro. Cada um funciona uma única vez e não será exibido de novo.
        </Banner>
        <div className="codigos-rec">
          {atual.codigos.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <Button onClick={() => (window.location.href = '/painel')}>Concluir</Button>
      </div>
    );
  }
  if (atual?.etapa === 'qr') {
    return (
      <form action={acao} className="form-pilha">
        <p>Leia o QR Code com um aplicativo autenticador e digite o código de 6 dígitos.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="qr" src={atual.qr} alt="QR Code para o aplicativo autenticador" width={220} height={220} />
        <p className="omv-legenda">
          Sem câmera? Digite a chave: <code>{atual.segredo}</code>
        </p>
        {atual.erro ? <Banner tipo="erro">{atual.erro}</Banner> : null}
        <TextField name="codigo" label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" required />
        <Button type="submit" disabled={pendente}>Confirmar</Button>
      </form>
    );
  }
  return (
    <div className="form-pilha">
      <p>
        {ativo
          ? 'A verificação em duas etapas está ativada. Você pode gerar um novo QR Code para trocar de aparelho.'
          : 'Adicione uma segunda etapa de proteção usando um aplicativo autenticador (TOTP).'}
      </p>
      <Button onClick={() => iniciar(async () => setQr(await gerarQrAcao()))}>
        {ativo ? 'Reconfigurar' : 'Configurar agora'}
      </Button>
    </div>
  );
}
