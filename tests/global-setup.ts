import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export default async function setup() {
  const url = process.env.DATABASE_URL_UNIT ?? 'postgres://omv:omv@localhost:5432/omv_test_unit';
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: 'db/migrations' });
  await sql.end();
}
