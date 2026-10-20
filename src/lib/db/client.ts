import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

const globalComDb = globalThis as unknown as { __omvSql?: postgres.Sql; __omvDb?: Db };

function criar(): { sql: postgres.Sql; db: Db } {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

export function obterDb(): Db {
  if (!globalComDb.__omvDb) {
    const { sql, db } = criar();
    globalComDb.__omvSql = sql;
    globalComDb.__omvDb = db;
  }
  return globalComDb.__omvDb;
}

/** Atalho: `db` só conecta no primeiro uso (build sem banco continua funcionando). */
export const db = new Proxy({} as Db, {
  get(_t, prop, receiver) {
    return Reflect.get(obterDb(), prop, receiver);
  },
});

export type { Db };
export { schema };
