import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { DOMINIOS_PADRAO } from '../dicionario/dominios';
import { PAPEIS_PADRAO, PERMISSOES, type CodigoPapel } from '../auth/permissoes';
import { hashSenha } from '../auth/senha';
import { cifrarSegredo, gerarCodigosRecuperacao, novoSegredoMfa } from '../auth/mfa';
import { randomBytes } from 'node:crypto';

type Db = PostgresJsDatabase<typeof schema>;

/** Parâmetros metodológicos — todos PROVISÓRIOS até validação institucional. */
export const CONFIG_PADRAO: Array<{ chave: string; valor: unknown; descricao: string }> = [
  { chave: 'supressao.k', valor: 5, descricao: 'Valores menores que k são suprimidos na divulgação.' },
  { chave: 'supressao.complementar', valor: true, descricao: 'Aplica supressão complementar contra recálculo por diferença.' },
  {
    chave: 'territorio.generalizar_para_regiao',
    valor: true,
    descricao: 'Generaliza bairro para região quando a célula do bairro precisa ser suprimida.',
  },
  { chave: 'filtros.max_dimensoes', valor: 2, descricao: 'Máximo de dimensões combináveis em uma consulta pública.' },
  { chave: 'retencao.arquivos_dias', valor: 30, descricao: 'Dias de retenção do arquivo original importado (cifrado).' },
  { chave: 'retencao.rascunhos_dias', valor: 90, descricao: 'Dias de retenção de rascunhos sem envio.' },
  { chave: 'fluxo.segregacao_aprovador', valor: true, descricao: 'Quem enviou não pode aprovar o próprio envio.' },
  { chave: 'validacao.variacao_alerta_pct', valor: 60, descricao: 'Variação (%) vs. envios anteriores que gera alerta.' },
];

export async function semearBase(db: Db) {
  for (const [codigo, descricao] of Object.entries(PERMISSOES)) {
    await db.insert(schema.permissoes).values({ codigo, descricao }).onConflictDoNothing();
  }
  for (const [codigo, p] of Object.entries(PAPEIS_PADRAO)) {
    const [papel] = await db
      .insert(schema.papeis)
      .values({ codigo, nome: p.nome, descricao: p.descricao, mfaObrigatorio: p.mfaObrigatorio })
      .onConflictDoUpdate({
        target: schema.papeis.codigo,
        set: { nome: p.nome, descricao: p.descricao, mfaObrigatorio: p.mfaObrigatorio },
      })
      .returning();
    // Só povoa as permissões de um papel recém-criado (não sobrescreve edições do administrador).
    const [{ n }] = (await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.papelPermissoes)
      .where(eq(schema.papelPermissoes.papelId, papel!.id))) as [{ n: number }];
    if (n === 0) {
      await db
        .insert(schema.papelPermissoes)
        .values(p.permissoes.map((pc) => ({ papelId: papel!.id, permissaoCodigo: pc })))
        .onConflictDoNothing();
    }
  }
  for (const c of CONFIG_PADRAO) {
    await db
      .insert(schema.configuracoesMetodologicas)
      .values({ chave: c.chave, valor: c.valor as never, descricao: c.descricao, provisorio: true })
      .onConflictDoNothing();
  }
  for (const [dominio, itens] of Object.entries(DOMINIOS_PADRAO)) {
    let ordem = 0;
    for (const it of itens as Array<{ codigo: string; rotulo: string; definicao?: string; unidadesPermitidas?: string[] }>) {
      await db
        .insert(schema.classificacoes)
        .values({
          dominio,
          codigo: it.codigo,
          rotulo: it.rotulo,
          definicao: it.definicao,
          ordem: ordem++,
          provisorio: true,
          metadados: it.unidadesPermitidas ? { unidadesPermitidas: it.unidadesPermitidas } : null,
        })
        .onConflictDoNothing();
    }
  }
}

export function senhaAleatoria(): string {
  return `${randomBytes(9).toString('base64url')}-A1!`;
}

export type UsuarioSemeado = { email: string; papel: CodigoPapel; senha: string; mfaSegredo?: string; entidade?: string };

export async function criarUsuario(
  db: Db,
  o: {
    email: string;
    nome: string;
    papel: CodigoPapel;
    senha: string;
    entidadeId?: string | null;
    trocarSenha?: boolean;
    comMfa?: boolean;
  },
): Promise<{ id: string; mfaSegredo?: string }> {
  const segredo = o.comMfa ? novoSegredoMfa() : undefined;
  const [u] = await db
    .insert(schema.usuarios)
    .values({
      email: o.email.toLowerCase(),
      nome: o.nome,
      senhaHash: await hashSenha(o.senha),
      entidadeId: o.entidadeId ?? null,
      trocarSenha: o.trocarSenha ?? false,
      mfaAtivo: !!segredo,
      mfaSegredoCifrado: segredo ? cifrarSegredo(segredo) : null,
      codigosRecuperacaoHash: segredo ? gerarCodigosRecuperacao().hashes : null,
    })
    .returning();
  const [papel] = await db.select().from(schema.papeis).where(eq(schema.papeis.codigo, o.papel));
  await db.insert(schema.usuarioPapeis).values({ usuarioId: u!.id, papelId: papel!.id });
  return { id: u!.id, mfaSegredo: segredo };
}

/** Dados de DESENVOLVIMENTO: entidades de teste, usuários com MFA pré-ativado e bairros demonstrativos. */
export async function semearDev(db: Db, senhas?: Partial<Record<string, string>>): Promise<UsuarioSemeado[]> {
  const entidadesDev = ['Entidade de teste A', 'Entidade de teste B'];
  const ids: Record<string, string> = {};
  for (const nome of entidadesDev) {
    const [existente] = await db.select().from(schema.entidades).where(eq(schema.entidades.nome, nome));
    ids[nome] =
      existente?.id ?? (await db.insert(schema.entidades).values({ nome, tipo: 'outra' }).returning())[0]!.id;
  }
  const regs: string[] = [];
  for (const [i, nome] of ['Região demonstrativa A', 'Região demonstrativa B', 'Região demonstrativa C'].entries()) {
    const [r] = await db
      .insert(schema.regioes)
      .values({ codigo: `demo-r${i + 1}`, nome, provisorio: true })
      .onConflictDoUpdate({ target: schema.regioes.codigo, set: { nome } })
      .returning();
    regs.push(r!.id);
  }
  for (let i = 1; i <= 12; i++) {
    await db
      .insert(schema.bairros)
      .values({
        codigo: `demo-b${String(i).padStart(2, '0')}`,
        nome: `Bairro demonstrativo ${String(i).padStart(2, '0')}`,
        regiaoId: regs[i % 3],
        provisorio: true,
      })
      .onConflictDoNothing();
  }
  const planos: Array<{ email: string; nome: string; papel: CodigoPapel; entidade?: string }> = [
    { email: 'admin@omv.test', nome: 'Administrador de teste', papel: 'administrador' },
    { email: 'gestor@omv.test', nome: 'Gestor de teste', papel: 'gestor' },
    { email: 'analista@omv.test', nome: 'Analista de teste', papel: 'analista' },
    { email: 'visualizador@omv.test', nome: 'Visualizador de teste', papel: 'visualizador' },
    { email: 'entidade-a@omv.test', nome: 'Usuária da entidade A', papel: 'entidade', entidade: entidadesDev[0] },
    { email: 'entidade-b@omv.test', nome: 'Usuária da entidade B', papel: 'entidade', entidade: entidadesDev[1] },
  ];
  const out: UsuarioSemeado[] = [];
  for (const p of planos) {
    const [ja] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, p.email));
    if (ja) continue;
    const senha = senhas?.[p.email] ?? senhaAleatoria();
    const { mfaSegredo } = await criarUsuario(db, {
      email: p.email,
      nome: p.nome,
      papel: p.papel,
      senha,
      entidadeId: p.entidade ? ids[p.entidade] : null,
      comMfa: PAPEIS_PADRAO[p.papel].mfaObrigatorio,
    });
    out.push({ email: p.email, papel: p.papel, senha, mfaSegredo, entidade: p.entidade });
  }
  return out;
}
