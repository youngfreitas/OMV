import { eq, sql } from 'drizzle-orm';
import { generateSync } from 'otplib';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/client';
import { sessoes, tentativasLogin, tokensRedefinicao, usuarios } from '@/lib/db/schema';
import { COOKIE_SESSAO } from '@/lib/auth/config';
import { decifrarSegredo } from '@/lib/auth/mfa';
import { duracaoBloqueioMs } from '@/lib/auth/ratelimit';
import { hashSenha, validarPoliticaSenha, verificarSenha } from '@/lib/auth/senha';
import { cifrar, decifrar, sha256Hex } from '@/lib/auth/cripto';
import { sessaoDoCookie, validarToken } from '@/lib/auth/sessao';
import { usuarioApi } from '@/lib/auth/guards';
import { PAPEIS_PADRAO, PERMISSOES, TODAS_PERMISSOES } from '@/lib/auth/permissoes';
import { autenticar, confirmarMfa, iniciarConfiguracaoMfa, redefinirSenhaComToken, solicitarRedefinicao, trocarSenha, verificarMfaLogin } from '@/server/auth';
import { resetarBanco, SENHA_TESTE, usuarioPorEmail } from './helpers/db';

const jar = () => (globalThis as unknown as { __jar: Map<string, string> }).__jar;

beforeAll(async () => {
  await resetarBanco();
});
beforeEach(async () => {
  jar().clear();
  await db.execute(sql`DELETE FROM tentativas_login`);
});

describe('senha e criptografia', () => {
  it('argon2id verifica e rejeita', async () => {
    const h = await hashSenha('Uma-Senha-Forte-123');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(await verificarSenha(h, 'Uma-Senha-Forte-123')).toBe(true);
    expect(await verificarSenha(h, 'outra')).toBe(false);
    expect(await verificarSenha('lixo', 'x')).toBe(false);
  });
  it('política de senha', () => {
    expect(validarPoliticaSenha('curta1A!')).not.toEqual([]);
    expect(validarPoliticaSenha('somenteminusculas')).not.toEqual([]);
    expect(validarPoliticaSenha('Boa-Senha-Longa-9')).toEqual([]);
    expect(validarPoliticaSenha('maria.souza-Aa1-xx', { email: 'maria.souza@x.gov.br' })).not.toEqual([]);
  });
  it('AES-256-GCM: ida e volta e detecção de adulteração', () => {
    const c = cifrar('segredo');
    expect(decifrar(c).toString()).toBe('segredo');
    const partes = c.split('.');
    partes[3] = Buffer.from('adulterado').toString('base64url');
    expect(() => decifrar(partes.join('.'))).toThrow();
  });
  it('bloqueio progressivo dobra até 60 min', () => {
    expect(duracaoBloqueioMs(4, 5)).toBe(0);
    expect(duracaoBloqueioMs(5, 5)).toBe(60_000);
    expect(duracaoBloqueioMs(7, 5)).toBe(4 * 60_000);
    expect(duracaoBloqueioMs(30, 5)).toBe(60 * 60_000);
  });
});

describe('login, sessão e MFA', () => {
  it('login correto cria sessão opaca (só o hash no banco) e exige MFA para analista', async () => {
    const r = await autenticar('analista@omv.test', SENHA_TESTE);
    expect(r).toEqual({ ok: true, destino: '/entrar/mfa' });
    const token = jar().get(COOKIE_SESSAO)!;
    expect(token.length).toBeGreaterThan(30);
    const [s] = await db.select().from(sessoes);
    expect(s!.tokenHash).toBe(sha256Hex(token));
    expect(s!.tokenHash).not.toBe(token);
    // Sem MFA verificado, a API privada recusa (403).
    await expect(usuarioApi('dados:ver_agregado')).rejects.toMatchObject({ status: 403 });
    // Verifica o MFA
    const u = await usuarioPorEmail('analista@omv.test');
    const [reg] = await db.select().from(usuarios).where(eq(usuarios.email, 'analista@omv.test'));
    const seg = decifrarSegredo(reg!.mfaSegredoCifrado!);
    const sess = await sessaoDoCookie();
    expect(await verificarMfaLogin({ ...u, sessaoId: sess!.id }, '000000')).toMatchObject({ ok: false });
    expect(await verificarMfaLogin({ ...u, sessaoId: sess!.id }, generateSync({ secret: seg }))).toEqual({ ok: true });
    await expect(usuarioApi('dados:ver_agregado')).resolves.toMatchObject({ email: 'analista@omv.test' });
  });

  it('visitante sem cookie recebe 401; perfil sem permissão recebe 403', async () => {
    await expect(usuarioApi('dados:ver_agregado')).rejects.toMatchObject({ status: 401 });
    await autenticar('entidade-a@omv.test', SENHA_TESTE);
    await expect(usuarioApi('usuarios:gerenciar')).rejects.toMatchObject({ status: 403 });
    await expect(usuarioApi('submissao:criar')).resolves.toBeTruthy();
  });

  it('mensagem idêntica para usuário inexistente e senha errada; bloqueia após 5 falhas', async () => {
    const a = await autenticar('naoexiste@omv.test', 'x');
    const b = await autenticar('entidade-a@omv.test', 'errada');
    expect(a).toEqual(b);
    for (let i = 0; i < 4; i++) await autenticar('entidade-a@omv.test', 'errada');
    const bloqueada = await autenticar('entidade-a@omv.test', SENHA_TESTE); // correta, mas já bloqueada
    expect(bloqueada.ok).toBe(false);
    expect((bloqueada as { erro: string }).erro).toMatch(/Muitas tentativas/);
    const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(tentativasLogin)) as [{ n: number }];
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it('sessão expira por inatividade e por limite absoluto; revogação funciona', async () => {
    await autenticar('visualizador@omv.test', SENHA_TESTE);
    const token = jar().get(COOKIE_SESSAO)!;
    expect(await validarToken(token)).not.toBeNull();
    expect(await validarToken(token, new Date(Date.now() + 31 * 60_000))).toBeNull(); // ocioso > 30 min
    expect(await validarToken(token, new Date(Date.now() + 13 * 3_600_000))).toBeNull(); // absoluto > 12 h
    await db.update(sessoes).set({ revogadaEm: new Date() }).where(eq(sessoes.tokenHash, sha256Hex(token)));
    expect(await validarToken(token)).toBeNull();
  });

  it('configuração de MFA: segredo cifrado no banco e códigos de recuperação únicos', async () => {
    await autenticar('visualizador@omv.test', SENHA_TESTE);
    const u = await usuarioPorEmail('visualizador@omv.test');
    const s = await usuarioPorEmail('visualizador@omv.test');
    const sess = await sessaoDoCookie();
    const ini = await iniciarConfiguracaoMfa({ ...s, sessaoId: sess!.id });
    const [reg] = await db.select().from(usuarios).where(eq(usuarios.id, u.id));
    expect(reg!.mfaSegredoCifrado).not.toContain(ini.segredo);
    const r = await confirmarMfa({ ...u, sessaoId: sess!.id }, generateSync({ secret: ini.segredo }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.codigosRecuperacao).toHaveLength(8);
      const [depois] = await db.select().from(usuarios).where(eq(usuarios.id, u.id));
      expect(depois!.codigosRecuperacaoHash).toContain(sha256Hex(r.codigosRecuperacao[0]!));
      expect(JSON.stringify(depois)).not.toContain(r.codigosRecuperacao[0]!);
    }
  });
});

describe('redefinição e troca de senha', () => {
  it('token de uso único, com expiração; hash no banco; revoga sessões', async () => {
    await autenticar('entidade-b@omv.test', SENHA_TESTE);
    await solicitarRedefinicao('entidade-b@omv.test');
    const [t] = await db.select().from(tokensRedefinicao);
    expect(t!.tokenHash).toHaveLength(64);
    // Não temos o token em claro (só enviado por e-mail): simulamos gerando um conhecido.
    const token = 'token-conhecido-de-teste-123456789012345';
    await db.update(tokensRedefinicao).set({ tokenHash: sha256Hex(token) }).where(eq(tokensRedefinicao.id, t!.id));
    expect(await redefinirSenhaComToken(token, 'curta')).toMatchObject({ ok: false });
    expect(await redefinirSenhaComToken(token, 'Nova-Senha-Muito-Boa-77')).toEqual({ ok: true });
    expect(await redefinirSenhaComToken(token, 'Outra-Senha-Muito-Boa-88')).toMatchObject({ ok: false }); // uso único
    await db.update(tokensRedefinicao).set({ usadoEm: null, expiraEm: new Date(Date.now() - 1000) });
    expect(await redefinirSenhaComToken(token, 'Outra-Senha-Muito-Boa-88')).toMatchObject({ ok: false }); // expirado
    jar().clear();
    expect((await autenticar('entidade-b@omv.test', SENHA_TESTE)).ok).toBe(false);
    await db.execute(sql`DELETE FROM tentativas_login`);
    expect((await autenticar('entidade-b@omv.test', 'Nova-Senha-Muito-Boa-77')).ok).toBe(true);
  });

  it('troca de senha exige a atual e diferente da nova', async () => {
    await db.execute(sql`DELETE FROM tentativas_login`);
    await autenticar('entidade-a@omv.test', SENHA_TESTE);
    const u = await usuarioPorEmail('entidade-a@omv.test');
    expect(await trocarSenha(u, 'errada', 'Nova-Senha-Boa-1234')).toMatchObject({ ok: false });
    expect(await trocarSenha(u, SENHA_TESTE, SENHA_TESTE)).toMatchObject({ ok: false });
    expect(await trocarSenha(u, SENHA_TESTE, 'Nova-Senha-Boa-1234')).toEqual({ ok: true });
  });
});

describe('matriz de permissões', () => {
  it('perfis padrão só usam permissões do catálogo e respeitam as regras do plano', () => {
    for (const p of Object.values(PAPEIS_PADRAO)) for (const c of p.permissoes) expect(Object.keys(PERMISSOES)).toContain(c);
    expect(PAPEIS_PADRAO.administrador.permissoes.sort()).toEqual([...TODAS_PERMISSOES].sort());
    for (const k of ['administrador', 'gestor', 'analista'] as const) expect(PAPEIS_PADRAO[k].mfaObrigatorio).toBe(true);
    expect(PAPEIS_PADRAO.entidade.permissoes).not.toContain('analise:ler');
    expect(PAPEIS_PADRAO.entidade.permissoes).not.toContain('submissao:ler_todas');
    expect(PAPEIS_PADRAO.visualizador.permissoes).not.toContain('dados:ver_nao_suprimido');
    expect(PAPEIS_PADRAO.analista.permissoes).not.toContain('publicacao:publicar');
    expect(PAPEIS_PADRAO.analista.permissoes).not.toContain('usuarios:gerenciar');
  });
});
