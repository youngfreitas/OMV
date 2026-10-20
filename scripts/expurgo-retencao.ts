/**
 * Expurgo por retenção (agendar diariamente, ex.: cron):
 *  - arquivos originais importados (cifrados) vencidos;
 *  - rascunhos sem envio há mais de N dias;
 *  - tokens de redefinição e tentativas de login antigos;
 *  - sessões expiradas/revogadas antigas.
 * A tabela de auditoria NÃO é expurgada por este script (append-only).
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const cliente = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(cliente);
  const cfg = async (chave: string, padrao: number) => {
    const r = (await db.execute(sql`select valor from configuracoes_metodologicas where chave = ${chave}`)) as unknown as Array<{ valor: unknown }>;
    return Number(r[0]?.valor ?? padrao);
  };
  const diasRascunho = await cfg('retencao.rascunhos_dias', 90);
  const contar = (r: unknown) => (r as { count?: number }).count ?? 0;
  const arq = await db.execute(sql`delete from arquivos_recebidos where expira_em < now()`);
  const rasc = await db.execute(sql`delete from submissoes where status = 'rascunho' and atualizado_em < now() - make_interval(days => ${diasRascunho})`);
  const tok = await db.execute(sql`delete from tokens_redefinicao where expira_em < now() - interval '7 days'`);
  const tent = await db.execute(sql`delete from tentativas_login where criado_em < now() - interval '30 days'`);
  const ses = await db.execute(sql`delete from sessoes where absoluta_em < now() - interval '30 days' or revogada_em < now() - interval '30 days'`);
  console.log(`Expurgo concluído: arquivos=${contar(arq)}, rascunhos=${contar(rasc)}, tokens=${contar(tok)}, tentativas=${contar(tent)}, sessões=${contar(ses)}.`);
  await cliente.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
