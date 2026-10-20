import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { writeFileSync } from 'node:fs';
import * as schema from '../src/lib/db/schema';
import { semearBase, semearDev } from '../src/lib/seed';

export const SENHA_E2E = 'Senha-Teste-E2E-1!';

export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TESTE ?? 'postgres://omv:omv@localhost:5432/omv_test';
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder: 'db/migrations' });
  // Zera os dados mantendo o esquema; a auditoria é append-only, então os triggers são suspensos só aqui (banco de TESTE).
  await sql.unsafe('ALTER TABLE auditoria DISABLE TRIGGER USER');
  const tabelas = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname='public' and tablename not like '\\_\\_%'`;
  await sql.unsafe(`TRUNCATE ${tabelas.map((t) => `"${t.tablename}"`).join(',')} RESTART IDENTITY CASCADE`);
  await sql.unsafe('ALTER TABLE auditoria ENABLE TRIGGER USER');
  await semearBase(db);
  const emails = ['admin', 'gestor', 'analista', 'visualizador', 'entidade-a', 'entidade-b'].map((e) => `${e}@omv.test`);
  const senhas = Object.fromEntries(emails.map((e) => [e, SENHA_E2E]));
  const us = await semearDev(db, senhas);
  writeFileSync('e2e/.estado.json', JSON.stringify(Object.fromEntries(us.map((u) => [u.email, u.mfaSegredo ?? null]))));
  await sql.end();
}
