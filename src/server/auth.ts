import 'server-only';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '@/lib/db/client';
import { tokensRedefinicao, usuarios } from '@/lib/db/schema';
import { ctxRequisicao, registrar } from '@/lib/auditoria';
import { sha256Hex, tokenAleatorio } from '@/lib/auth/cripto';
import { hashFalso, hashSenha, validarPoliticaSenha, verificarSenha } from '@/lib/auth/senha';
import { verificarBloqueio, registrarTentativa } from '@/lib/auth/ratelimit';
import {
  criarSessao,
  encerrarSessaoAtual,
  marcarMfaVerificado,
  revogarSessoesDoUsuario,
} from '@/lib/auth/sessao';
import {
  cifrarSegredo,
  decifrarSegredo,
  gerarCodigosRecuperacao,
  novoSegredoMfa,
  uriMfa,
  verificarTotp,
} from '@/lib/auth/mfa';
import { carregarUsuario, type UsuarioAtual } from '@/lib/auth/usuario';
import { pendenciaDeAcesso } from '@/lib/auth/guards';
import { enviarEmail } from '@/lib/email';

const MSG_FALHA = 'E-mail ou senha incorretos.';

export type ResultadoLogin = { ok: true; destino: string } | { ok: false; erro: string };

export async function autenticar(emailBruto: string, senha: string): Promise<ResultadoLogin> {
  const email = emailBruto.trim().toLowerCase();
  const { ip, userAgent } = await ctxRequisicao();
  const bloqueio = await verificarBloqueio(email, ip);
  if (bloqueio.bloqueado) {
    await registrar({ acao: 'login.bloqueado', detalhes: { email }, ip });
    const min = Math.max(1, Math.ceil((bloqueio.ate.getTime() - Date.now()) / 60_000));
    return { ok: false, erro: `Muitas tentativas. Aguarde ${min} min e tente novamente.` };
  }
  const [u] = await db.select().from(usuarios).where(sql`lower(${usuarios.email}) = ${email}`).limit(1);
  const valido = u
    ? await verificarSenha(u.senhaHash, senha)
    : (await verificarSenha(await hashFalso(), senha), false);
  const liberado = !!u && valido && u.ativo && !(u.bloqueadoAte && u.bloqueadoAte > new Date());
  await registrarTentativa(email, ip, liberado);
  if (!u || !liberado) {
    await registrar({ usuarioId: u?.id, acao: 'login.falha', detalhes: { email }, ip });
    return { ok: false, erro: MSG_FALHA };
  }
  const token = await criarSessao(u.id, { ip, userAgent, mfaVerificado: false });
  void token;
  await db.update(usuarios).set({ ultimoAcesso: new Date() }).where(eq(usuarios.id, u.id));
  await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'login.sucesso', ip });
  const atual = await carregarSessaoRecemCriada(u.id);
  return { ok: true, destino: (atual && pendenciaDeAcesso(atual)) ?? '/painel' };
}

async function carregarSessaoRecemCriada(usuarioId: string): Promise<UsuarioAtual | null> {
  // A sessão acabou de ser criada nesta requisição: o cookie ainda não está no jar de leitura,
  // então carregamos pelo usuário com mfaVerificado=false.
  return carregarUsuario(usuarioId, { id: 'novo', mfaVerificado: false });
}

export async function sair(u?: UsuarioAtual) {
  await encerrarSessaoAtual();
  if (u) await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'logout' });
}

/* ───────────── MFA ───────────── */

export async function verificarMfaLogin(u: UsuarioAtual, codigo: string): Promise<{ ok: boolean; erro?: string }> {
  const { ip } = await ctxRequisicao();
  const chave = `mfa:${u.id}`;
  const bloqueio = await verificarBloqueio(chave, ip);
  if (bloqueio.bloqueado) return { ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' };
  const [reg] = await db.select().from(usuarios).where(eq(usuarios.id, u.id)).limit(1);
  if (!reg?.mfaSegredoCifrado) return { ok: false, erro: 'MFA não configurado.' };
  let ok = verificarTotp(decifrarSegredo(reg.mfaSegredoCifrado), codigo);
  if (!ok && reg.codigosRecuperacaoHash?.length) {
    const h = sha256Hex(codigo.trim().toLowerCase());
    if (reg.codigosRecuperacaoHash.includes(h)) {
      ok = true;
      await db
        .update(usuarios)
        .set({ codigosRecuperacaoHash: reg.codigosRecuperacaoHash.filter((x) => x !== h) })
        .where(eq(usuarios.id, u.id));
      await registrar({ usuarioId: u.id, acao: 'mfa.codigo_recuperacao_usado', ip });
    }
  }
  await registrarTentativa(chave, ip, ok);
  if (!ok) {
    await registrar({ usuarioId: u.id, acao: 'mfa.falha', ip });
    return { ok: false, erro: 'Código inválido.' };
  }
  await marcarMfaVerificado(u.sessaoId);
  await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'mfa.verificado', ip });
  return { ok: true };
}

export async function iniciarConfiguracaoMfa(u: UsuarioAtual) {
  const segredo = novoSegredoMfa();
  await db
    .update(usuarios)
    .set({ mfaSegredoCifrado: cifrarSegredo(segredo), mfaAtivo: false })
    .where(eq(usuarios.id, u.id));
  const uri = uriMfa(u.email, segredo);
  return { segredo, uri, qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

export async function confirmarMfa(
  u: UsuarioAtual,
  codigo: string,
): Promise<{ ok: true; codigosRecuperacao: string[] } | { ok: false; erro: string }> {
  const [reg] = await db.select().from(usuarios).where(eq(usuarios.id, u.id)).limit(1);
  if (!reg?.mfaSegredoCifrado) return { ok: false, erro: 'Gere um novo QR Code.' };
  if (!verificarTotp(decifrarSegredo(reg.mfaSegredoCifrado), codigo)) return { ok: false, erro: 'Código inválido.' };
  const { claros, hashes } = gerarCodigosRecuperacao();
  await db.update(usuarios).set({ mfaAtivo: true, codigosRecuperacaoHash: hashes }).where(eq(usuarios.id, u.id));
  await marcarMfaVerificado(u.sessaoId);
  await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'mfa.ativado' });
  return { ok: true, codigosRecuperacao: claros };
}

/* ───────────── Senha ───────────── */

export async function solicitarRedefinicao(emailBruto: string): Promise<void> {
  const email = emailBruto.trim().toLowerCase();
  const [u] = await db.select().from(usuarios).where(sql`lower(${usuarios.email}) = ${email}`).limit(1);
  await registrar({ usuarioId: u?.id, acao: 'senha.redefinicao_solicitada', detalhes: { existe: !!u } });
  if (!u || !u.ativo) return;
  const token = tokenAleatorio(32);
  await db.insert(tokensRedefinicao).values({
    usuarioId: u.id,
    tokenHash: sha256Hex(token),
    expiraEm: new Date(Date.now() + 30 * 60_000),
  });
  const base = process.env.OMV_URL_PUBLICA ?? 'http://localhost:3000';
  await enviarEmail(
    u.email,
    'OMV — redefinição de senha',
    `Para redefinir sua senha, acesse o link abaixo (válido por 30 minutos, uso único):\n${base}/recuperar-senha/${token}\n\nSe você não pediu, ignore esta mensagem.`,
  );
}

export async function redefinirSenhaComToken(
  token: string,
  nova: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const [t] = await db
    .select()
    .from(tokensRedefinicao)
    .where(
      and(
        eq(tokensRedefinicao.tokenHash, sha256Hex(token)),
        isNull(tokensRedefinicao.usadoEm),
        gt(tokensRedefinicao.expiraEm, new Date()),
      ),
    )
    .limit(1);
  if (!t) return { ok: false, erro: 'Link inválido ou expirado. Solicite um novo.' };
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, t.usuarioId)).limit(1);
  if (!u) return { ok: false, erro: 'Link inválido ou expirado. Solicite um novo.' };
  const problemas = validarPoliticaSenha(nova, { email: u.email, nome: u.nome });
  if (problemas.length) return { ok: false, erro: problemas.join(' ') };
  await db.update(usuarios).set({ senhaHash: await hashSenha(nova), trocarSenha: false }).where(eq(usuarios.id, u.id));
  await db.update(tokensRedefinicao).set({ usadoEm: new Date() }).where(eq(tokensRedefinicao.id, t.id));
  await revogarSessoesDoUsuario(u.id);
  await registrar({ usuarioId: u.id, acao: 'senha.redefinida' });
  return { ok: true };
}

export async function trocarSenha(
  u: UsuarioAtual,
  atual: string,
  nova: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const [reg] = await db.select().from(usuarios).where(eq(usuarios.id, u.id)).limit(1);
  if (!reg || !(await verificarSenha(reg.senhaHash, atual))) return { ok: false, erro: 'Senha atual incorreta.' };
  if (atual === nova) return { ok: false, erro: 'A nova senha deve ser diferente da atual.' };
  const problemas = validarPoliticaSenha(nova, { email: u.email, nome: u.nome });
  if (problemas.length) return { ok: false, erro: problemas.join(' ') };
  await db.update(usuarios).set({ senhaHash: await hashSenha(nova), trocarSenha: false }).where(eq(usuarios.id, u.id));
  await revogarSessoesDoUsuario(u.id, u.sessaoId);
  await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'senha.trocada' });
  return { ok: true };
}
