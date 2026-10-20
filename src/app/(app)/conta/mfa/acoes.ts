'use server';

import { requireUser } from '@/lib/auth/guards';
import { confirmarMfa, iniciarConfiguracaoMfa } from '@/server/auth';

export type EstadoMfa =
  | { etapa: 'inicio' }
  | { etapa: 'qr'; qr: string; segredo: string; erro?: string }
  | { etapa: 'pronto'; codigos: string[] };

export async function gerarQrAcao(): Promise<EstadoMfa> {
  const u = await requireUser({ permitirPendente: true });
  const r = await iniciarConfiguracaoMfa(u);
  return { etapa: 'qr', qr: r.qrDataUrl, segredo: r.segredo };
}

export async function confirmarMfaAcao(anterior: EstadoMfa, fd: FormData): Promise<EstadoMfa> {
  const u = await requireUser({ permitirPendente: true });
  const r = await confirmarMfa(u, String(fd.get('codigo') ?? ''));
  if (!r.ok) return anterior.etapa === 'qr' ? { ...anterior, erro: r.erro } : { etapa: 'inicio' };
  return { etapa: 'pronto', codigos: r.codigosRecuperacao };
}
