import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { semearBase, semearDev } from '@/lib/seed';
import { carregarUsuario, type UsuarioAtual } from '@/lib/auth/usuario';
import { usuarios } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const SENHA_TESTE = 'Senha-Teste-Vitest-1!';

/** Zera o banco de TESTE (suspende o trigger de auditoria só aqui) e semeia base + usuários de desenvolvimento. */
export async function resetarBanco() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('omv_test')) throw new Error('Recusado: resetarBanco só roda no banco omv_test.');
  await db.execute(sql`ALTER TABLE auditoria DISABLE TRIGGER USER`);
  await db.execute(sql`
    DO $$ DECLARE r record; BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '\\_\\_%' LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP; END $$;`);
  await db.execute(sql`ALTER TABLE auditoria ENABLE TRIGGER USER`);
  await semearBase(db as never);
  const emails = ['admin', 'gestor', 'analista', 'visualizador', 'entidade-a', 'entidade-b'].map((e) => `${e}@omv.test`);
  await semearDev(db as never, Object.fromEntries(emails.map((e) => [e, SENHA_TESTE])));
}

export async function usuarioPorEmail(email: string): Promise<UsuarioAtual> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  const r = await carregarUsuario(u!.id, { id: `sessao-${email}`, mfaVerificado: true });
  return r!;
}
