import './env';
/**
 * DESENVOLVIMENTO: gera novas senhas (e novos segredos MFA) para os usuários @omv.test e as imprime.
 * Recusado em produção.
 */
import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';
import { gerarCodigosRecuperacao, cifrarSegredo, novoSegredoMfa } from '../src/lib/auth/mfa';
import { hashSenha } from '../src/lib/auth/senha';
import { senhaAleatoria } from '../src/lib/seed';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Proibido em produção.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  const us = await db.select().from(schema.usuarios).where(like(schema.usuarios.email, '%@omv.test'));
  if (!us.length) console.log('Nenhum usuário @omv.test encontrado. Rode: pnpm db:seed:dev');
  console.log('\n=== NOVAS CREDENCIAIS DE DESENVOLVIMENTO (copie agora) ===');
  for (const u of us) {
    const senha = senhaAleatoria();
    const exigeMfa = u.mfaAtivo || ['admin', 'gestor', 'analista'].some((p) => u.email.startsWith(`${p}@`));
    const segredo = exigeMfa ? novoSegredoMfa() : null;
    await db
      .update(schema.usuarios)
      .set({
        senhaHash: await hashSenha(senha),
        trocarSenha: false,
        bloqueadoAte: null,
        mfaAtivo: !!segredo,
        mfaSegredoCifrado: segredo ? cifrarSegredo(segredo) : null,
        codigosRecuperacaoHash: segredo ? gerarCodigosRecuperacao().hashes : null,
      })
      .where(eq(schema.usuarios.id, u.id));
    console.log(`${u.email}  senha=${senha}${segredo ? `  mfa_segredo=${segredo}` : ''}`);
  }
  await db.delete(schema.tentativasLogin);
  await db.update(schema.sessoes).set({ revogadaEm: new Date() });
  await sql.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
