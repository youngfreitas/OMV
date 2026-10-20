import 'server-only';
import { and, count, eq, gt, max, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { tentativasLogin } from '@/lib/db/schema';
import { JANELA_TENTATIVAS_MS, MAX_TENTATIVAS_CONTA, MAX_TENTATIVAS_IP } from './config';

export type Bloqueio = { bloqueado: false } | { bloqueado: true; ate: Date };

/** Bloqueio progressivo: 1 min após a 5ª falha, dobrando a cada nova falha, até 60 min. */
export function duracaoBloqueioMs(falhas: number, limite: number): number {
  if (falhas < limite) return 0;
  return Math.min(60, 2 ** (falhas - limite)) * 60_000;
}

export async function verificarBloqueio(email: string, ip: string, agora = new Date()): Promise<Bloqueio> {
  const desde = new Date(agora.getTime() - JANELA_TENTATIVAS_MS);
  const em = email.toLowerCase();

  // Falhas desde o último sucesso, dentro da janela.
  const [conta] = await db
    .select({ n: count(), ultima: max(tentativasLogin.criadoEm) })
    .from(tentativasLogin)
    .where(
      and(
        eq(tentativasLogin.email, em),
        eq(tentativasLogin.ip, ip),
        eq(tentativasLogin.sucesso, false),
        gt(tentativasLogin.criadoEm, desde),
        gt(
          tentativasLogin.criadoEm,
          sql`coalesce((select max(criado_em) from tentativas_login t2 where t2.email = ${em} and t2.ip = ${ip} and t2.sucesso), 'epoch'::timestamptz)`,
        ),
      ),
    );
  const [porIp] = await db
    .select({ n: count(), ultima: max(tentativasLogin.criadoEm) })
    .from(tentativasLogin)
    .where(and(eq(tentativasLogin.ip, ip), eq(tentativasLogin.sucesso, false), gt(tentativasLogin.criadoEm, desde)));

  const candidatos: Date[] = [];
  const dc = duracaoBloqueioMs(conta?.n ?? 0, MAX_TENTATIVAS_CONTA);
  if (dc && conta?.ultima) candidatos.push(new Date(conta.ultima.getTime() + dc));
  const di = duracaoBloqueioMs(porIp?.n ?? 0, MAX_TENTATIVAS_IP);
  if (di && porIp?.ultima) candidatos.push(new Date(porIp.ultima.getTime() + di));
  const ate = candidatos.sort((a, b) => b.getTime() - a.getTime())[0];
  return ate && ate > agora ? { bloqueado: true, ate } : { bloqueado: false };
}

export async function registrarTentativa(email: string, ip: string, sucesso: boolean) {
  await db.insert(tentativasLogin).values({ email: email.toLowerCase(), ip, sucesso });
}
