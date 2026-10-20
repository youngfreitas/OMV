import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(dado: string | Buffer): string {
  return createHash('sha256').update(dado).digest('hex');
}

export function tokenAleatorio(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hmacHex(dado: string): string {
  const seg = process.env.OMV_SEGREDO_APP;
  if (!seg) throw new Error('OMV_SEGREDO_APP não definida');
  return createHmac('sha256', seg).update(dado).digest('hex');
}

export function iguaisSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function chave(): Buffer {
  const b64 = process.env.OMV_CHAVE_CIFRA;
  if (!b64) throw new Error('OMV_CHAVE_CIFRA não definida');
  const k = Buffer.from(b64, 'base64');
  if (k.length !== 32) throw new Error('OMV_CHAVE_CIFRA deve ter 32 bytes em base64');
  return k;
}

/** AES-256-GCM. Formato: v1.iv.tag.cifrado (base64url). */
export function cifrar(claro: string | Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(), iv);
  const enc = Buffer.concat([c.update(claro), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}

export function decifrar(cifrado: string): Buffer {
  const [v, iv, tag, enc] = cifrado.split('.');
  if (v !== 'v1' || !iv || !tag || !enc) throw new Error('Formato cifrado inválido');
  const d = createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(enc, 'base64url')), d.final()]);
}

export function cifrarBuffer(b: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(), iv);
  const enc = Buffer.concat([c.update(b), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]);
}

export function decifrarBuffer(b: Buffer): Buffer {
  const d = createDecipheriv('aes-256-gcm', chave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]);
}
