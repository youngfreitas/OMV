import { eq, sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/client';
import { auditoria, registrosAprovados, registrosRecebidos, submissaoVersoes, submissoes } from '@/lib/db/schema';
import { ErroAcesso, ErroNegocio } from '@/lib/auth/erros';
import { executarAcao } from '@/server/analise';
import { detalheSubmissao, enviarSubmissao, reenviarSubmissao, salvarRascunho, listarSubmissoes } from '@/server/submissoes';
import { resetarBanco, usuarioPorEmail } from './helpers/db';
import type { UsuarioAtual } from '@/lib/auth/usuario';

let entA: UsuarioAtual, entB: UsuarioAtual, analista: UsuarioAtual, gestor: UsuarioAtual;

const linha = (extra: Record<string, string> = {}) => ({
  periodo_inicio: '2026-03-01',
  periodo_fim: '2026-03-31',
  bairro: 'Bairro demonstrativo 01',
  tipo_registro: 'atendimento_servico',
  unidade_contagem: 'atendimento',
  categoria_violencia: 'psicologica',
  faixa_etaria: '25_34',
  tipo_atendimento: 'acolhimento',
  quantidade: '12',
  ...extra,
});

async function enviar(u: UsuarioAtual, linhas = [linha()]) {
  const r = await salvarRascunho(u, { cabecalho: {}, linhas });
  const e = await enviarSubmissao(u, r.id, { declaracao: true });
  return { id: r.id, protocolo: e.protocolo };
}

beforeAll(async () => {
  await resetarBanco();
  entA = await usuarioPorEmail('entidade-a@omv.test');
  entB = await usuarioPorEmail('entidade-b@omv.test');
  analista = await usuarioPorEmail('analista@omv.test');
  gestor = await usuarioPorEmail('gestor@omv.test');
});

describe('fluxo de submissões', () => {
  it('envio → análise → devolução → correção → reenvio → aprovação → retirada', async () => {
    const { id, protocolo } = await enviar(entA);
    expect(protocolo).toMatch(/^OMV-\d{4}-\d{6}$/);
    await expect(executarAcao(analista, id, 'aprovar')).rejects.toMatchObject({ codigo: 'estado_invalido' });
    await executarAcao(analista, id, 'iniciar_analise');
    await expect(executarAcao(analista, id, 'devolver', { justificativa: 'curta' })).rejects.toMatchObject({ codigo: 'justificativa' });
    await executarAcao(analista, id, 'devolver', { justificativa: 'Confirmar o total do bairro.', pendencias: [{ descricao: 'Conferir linha 1' }] });
    expect((await detalheSubmissao(entA, id)).submissao.status).toBe('pendente_correcao');

    // Entidade corrige (nova versão) e reenvia
    await expect(reenviarSubmissao(entA, id, { declaracao: true })).rejects.toMatchObject({ codigo: 'sem_correcao' });
    await salvarRascunho(entA, { id, cabecalho: {}, linhas: [linha({ quantidade: '13' })] });
    await reenviarSubmissao(entA, id, { declaracao: true });
    const [s] = await db.select().from(submissoes).where(eq(submissoes.id, id));
    expect(s!.status).toBe('reenviado');
    expect(s!.versaoAtual).toBe(2);

    await executarAcao(analista, id, 'iniciar_analise');
    await executarAcao(analista, id, 'aprovar');
    const aprov = await db.select().from(registrosAprovados).where(eq(registrosAprovados.submissaoId, id));
    expect(aprov).toHaveLength(1);
    expect(aprov[0]).toMatchObject({ quantidade: 13, periodo: '2026-03', ativo: true, categoriaViolencia: 'psicologica' });

    await expect(executarAcao(gestor, id, 'retirar', { justificativa: 'x' })).rejects.toBeInstanceOf(ErroNegocio);
    await executarAcao(gestor, id, 'retirar', { justificativa: 'Retirada por erro de consolidação.' });
    const depois = await db.select().from(registrosAprovados).where(eq(registrosAprovados.submissaoId, id));
    expect(depois[0]!.ativo).toBe(false);
    expect(depois[0]!.retiradoEm).not.toBeNull();
  });

  it('isolamento entre entidades: B não vê nem lista o envio de A', async () => {
    const { id } = await enviar(entA);
    await expect(detalheSubmissao(entB, id)).rejects.toMatchObject({ codigo: 'nao_encontrado' });
    const listaB = await listarSubmissoes(entB);
    expect(listaB.find((x) => x.id === id)).toBeUndefined();
    await expect(salvarRascunho(entB, { id, cabecalho: {}, linhas: [linha()] })).rejects.toMatchObject({ codigo: 'nao_encontrado' });
    await expect(enviarSubmissao(entB, id, { declaracao: true })).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('entidade não executa ações de análise; analista não cria envio', async () => {
    const { id } = await enviar(entA);
    await expect(executarAcao(entA, id, 'iniciar_analise')).rejects.toBeInstanceOf(ErroAcesso);
    await expect(salvarRascunho(analista, { cabecalho: {}, linhas: [linha()] })).rejects.toBeInstanceOf(ErroAcesso);
  });

  it('dado pessoal: envio fica restrito, é redigido no banco e não pode ser aprovado', async () => {
    const PII = 'Ligar (12) 99876-5432 ou maria@exemplo.com';
    const { id } = await enviar(entA, [linha({ observacao: PII })]);
    const [s] = await db.select().from(submissoes).where(eq(submissoes.id, id));
    expect(s!.restrita).toBe(true);
    const rr = JSON.stringify(await db.select().from(registrosRecebidos).where(eq(registrosRecebidos.submissaoId, id)));
    const vv = JSON.stringify(await db.select().from(submissaoVersoes).where(eq(submissaoVersoes.submissaoId, id)));
    for (const trecho of ['99876', 'maria@exemplo']) {
      expect(rr).not.toContain(trecho);
      expect(vv).not.toContain(trecho); // payload cifrado
    }
    const logs = JSON.stringify(await db.select().from(auditoria));
    expect(logs).not.toContain('99876');
    await executarAcao(analista, id, 'iniciar_analise');
    await expect(executarAcao(analista, id, 'aprovar')).rejects.toMatchObject({ codigo: 'restrito' });
  });

  it('segregação de funções: quem enviou não aprova', async () => {
    const { id } = await enviar(entA);
    await db.update(submissoes).set({ enviadoPor: analista.id }).where(eq(submissoes.id, id));
    await executarAcao(analista, id, 'iniciar_analise');
    await expect(executarAcao(analista, id, 'aprovar')).rejects.toMatchObject({ codigo: 'segregacao' });
  });

  it('idempotência: reenviar o mesmo rascunho devolve o mesmo protocolo', async () => {
    const r = await salvarRascunho(entA, { cabecalho: {}, linhas: [linha({ quantidade: '5' })] });
    const a = await enviarSubmissao(entA, r.id, { declaracao: true });
    const b = await enviarSubmissao(entA, r.id, { declaracao: true });
    expect(b).toMatchObject({ protocolo: a.protocolo, jaEnviado: true });
  });

  it('exige declaração e bloqueia erros de validação', async () => {
    const r = await salvarRascunho(entA, { cabecalho: {}, linhas: [linha()] });
    await expect(enviarSubmissao(entA, r.id, { declaracao: false })).rejects.toMatchObject({ codigo: 'declaracao' });
    const ruim = await salvarRascunho(entA, { cabecalho: {}, linhas: [linha({ quantidade: '-2' })] });
    await expect(enviarSubmissao(entA, ruim.id, { declaracao: true })).rejects.toMatchObject({ codigo: 'validacao' });
  });

  it('auditoria é append-only (trigger impede UPDATE e DELETE)', async () => {
    await expect(db.execute(sql`UPDATE auditoria SET acao = 'x'`)).rejects.toThrow();
    await expect(db.execute(sql`DELETE FROM auditoria`)).rejects.toThrow();
    await expect(db.execute(sql`TRUNCATE auditoria`)).rejects.toThrow();
  });
});
