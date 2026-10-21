import './env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';
import { criarUsuario, semearBase, semearDev, senhaAleatoria } from '../src/lib/seed';

async function main() {
  const dev = process.argv.includes('--dev');
  if (dev && process.env.NODE_ENV === 'production') throw new Error('--dev é proibido em produção.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  await semearBase(db);
  console.log('Base semeada: permissões, perfis, parâmetros (PROVISÓRIOS) e classificações.');

  if (dev) {
    const us = await semearDev(db);
    console.log('\n=== USUÁRIOS DE DESENVOLVIMENTO (nunca use em produção) ===');
    for (const u of us) {
      console.log(`${u.email}  senha=${u.senha}${u.mfaSegredo ? `  mfa_segredo=${u.mfaSegredo}` : ''}`);
    }
    if (!us.length) console.log('(já existiam; nenhuma senha nova foi gerada)');
  } else if (process.env.OMV_ADMIN_EMAIL) {
    const email = process.env.OMV_ADMIN_EMAIL.toLowerCase();
    const senha = senhaAleatoria();
    try {
      await criarUsuario(db, { email, nome: 'Administrador inicial', papel: 'administrador', senha, trocarSenha: true });
      console.log(`\nAdministrador inicial criado: ${email}\nSenha temporária (exibida uma única vez): ${senha}\nA troca é obrigatória no primeiro acesso.`);
    } catch {
      console.log('Administrador inicial já existe.');
    }
  }
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
