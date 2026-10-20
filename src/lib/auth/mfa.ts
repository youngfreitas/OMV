import { generateSecret, generateURI, verifySync } from 'otplib';
import { randomBytes } from 'node:crypto';
import { cifrar, decifrar, sha256Hex } from './cripto';

export function novoSegredoMfa(): string {
  return generateSecret();
}

export function uriMfa(email: string, segredo: string): string {
  return generateURI({ issuer: 'OMV Ubatuba', label: email, secret: segredo });
}

export function cifrarSegredo(s: string): string {
  return cifrar(s);
}

export function decifrarSegredo(c: string): string {
  return decifrar(c).toString('utf8');
}

/** Verifica um código TOTP de 6 dígitos (tolerância de ±1 janela de 30 s). */
export function verificarTotp(segredo: string, codigo: string): boolean {
  const limpo = codigo.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(limpo)) return false;
  try {
    return verifySync({ secret: segredo, token: limpo, epochTolerance: 30 }).valid === true;
  } catch {
    return false;
  }
}

export function gerarCodigosRecuperacao(n = 8): { claros: string[]; hashes: string[] } {
  const claros = Array.from({ length: n }, () => {
    const b = randomBytes(5).toString('hex');
    return `${b.slice(0, 5)}-${b.slice(5)}`;
  });
  return { claros, hashes: claros.map((c) => sha256Hex(c)) };
}
