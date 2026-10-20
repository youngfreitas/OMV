import { hash, verify } from '@node-rs/argon2';

// argon2id (algoritmo 2). Parâmetros OWASP: m=19 MiB, t=2, p=1.
const OPCOES = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

export async function verificarSenha(hashArmazenado: string, senha: string): Promise<boolean> {
  try {
    return await verify(hashArmazenado, senha);
  } catch {
    return false;
  }
}

/** Hash fixo usado para igualar o tempo de resposta quando o usuário não existe. */
let falso: Promise<string> | null = null;
export function hashFalso(): Promise<string> {
  falso ??= hashSenha('senha-inexistente-omv');
  return falso;
}

const COMUNS = ['senha1234567', 'omv123456789', 'ubatuba12345', 'administrador'];

/** Política: mínimo de 12 caracteres, 3 de 4 classes, sem e-mail/nome. Retorna lista de problemas. */
export function validarPoliticaSenha(senha: string, contexto: { email?: string; nome?: string } = {}): string[] {
  const erros: string[] = [];
  if (senha.length < 12) erros.push('Use ao menos 12 caracteres.');
  if (senha.length > 200) erros.push('Use no máximo 200 caracteres.');
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (classes < 3) erros.push('Combine ao menos três tipos: minúsculas, maiúsculas, números e símbolos.');
  const baixa = senha.toLowerCase();
  const local = contexto.email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && baixa.includes(local)) erros.push('A senha não pode conter seu e-mail.');
  if (COMUNS.some((c) => baixa.includes(c))) erros.push('Evite senhas comuns.');
  return erros;
}
