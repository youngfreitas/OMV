import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db/client';
import { indicadoresPublicados, publicacoes } from '@/lib/db/schema';
import { executarAcao } from '@/server/analise';
import { gerarPublicacao, publicacaoAtual, publicar, retirarPublicacao } from '@/server/publicacao';
import { consultarIndicadoresPublicos, MENSAGEM_INDISPONIVEL } from '@/server/publico';
import { enviarSubmissao, salvarRascunho } from '@/server/submissoes';
import type { UsuarioAtual } from '@/lib/auth/usuario';
import { resetarBanco, usuarioPorEmail } from './helpers/db';

let entA: UsuarioAtual, analista: UsuarioAtual, gestor: UsuarioAtual, visualizador: UsuarioAtual;

const linha = (extra: Record<string, string> = {}) => ({
  periodo_inicio: '2026-03-01',
  periodo_fim: '2026-03-31',
  bairro: 'Bairro demonstrativo 01',
  tipo_registro: 'atendimento_servico',
  unidade_contagem: 'atendimento',
  categoria_violencia: 'psicologica',
  faixa_etaria: '25_34',
  tipo_atendimento: 'acolhimento',
  quantidade: '20',
  ...extra,
});

async function enviarEAprovar(linhas: ReturnType<typeof linha>[]) {
  const r = await salvarRascunho(entA, { cabecalho: {}, linhas });
  await enviarSubmissao(entA, r.id, { declaracao: true });
  await executarAcao(analista, r.id, 'iniciar_analise');
  await executarAcao(analista, r.id, 'aprovar');
  return r.id;
}

beforeAll(async () => {
  await resetarBanco();
  entA = await usuarioPorEmail('entidade-a@omv.test');
  analista = await usuarioPorEmail('analista@omv.test');
  gestor = await usuarioPorEmail('gestor@omv.test');
  visualizador = await usuarioPorEmail('visualizador@omv.test');
});

describe('publicação', () => {
  it('sem publicação, a API pública não expõe nada', async () => {
    const r = await consultarIndicadoresPublicos({ cubo: 'total' });
    expect(r.disponivel).toBe(false);
    expect(r.celulas).toEqual([]);
  });

  it('aprovar não publica; gerar+publicar expõe valores protegidos; retirada remove', async () => {
    const id1 = await enviarEAprovar([linha(), linha({ bairro: 'Bairro demonstrativo 02', quantidade: '3', categoria_violencia: 'fisica' })]);
    expect((await consultarIndicadoresPublicos({ cubo: 'total' })).disponivel).toBe(false);
    await expect(gerarPublicacao(analista)).rejects.toThrow(); // sem permissão
    await expect(gerarPublicacao(visualizador)).rejects.toThrow();

    const pub = await gerarPublicacao(gestor);
    expect((await consultarIndicadoresPublicos({ cubo: 'total' })).disponivel).toBe(false); // gerada ≠ publicada
    await publicar(gestor, pub.id);
    expect((await publicacaoAtual())?.id).toBe(pub.id);

    const total = await consultarIndicadoresPublicos({ cubo: 'total', periodo: 'todos' });
    expect(total.disponivel).toBe(true);
    expect(total.celulas[0]).toMatchObject({ valor: 23, suprimido: false });

    // O valor 3 (< k=5) está suprimido no território e o valor nunca aparece na API.
    const terr = await consultarIndicadoresPublicos({ cubo: 'territorio', periodo: '2026-03' });
    const b2 = terr.celulas.find((c) => c.nome === 'Bairro demonstrativo 02')!;
    expect(b2).toMatchObject({ suprimido: true, valor: null });
    expect(JSON.stringify(terr)).not.toMatch(/"valor":3[,}]/);

    // Combinação não pré-computada
    const comb = await consultarIndicadoresPublicos({ cubo: 'territorio', filtros: ['categoria'] });
    expect(comb.disponivel).toBe(false);
    expect(comb.mensagem).toBe(MENSAGEM_INDISPONIVEL);

    // Retirada do envio ⇒ republicação automática sem os registros
    await executarAcao(gestor, id1, 'retirar', { justificativa: 'Retirada por inconsistência de consolidação.' });
    const aposRetirada = await publicacaoAtual();
    // Era o único envio aprovado: não resta nada a publicar, então a publicação sai do ar.
    expect(aposRetirada).toBeNull();
    const prev = await db.select().from(publicacoes).where(eq(publicacoes.id, pub.id));
    expect(prev[0]!.status).toBe('retirada');
    expect((await consultarIndicadoresPublicos({ cubo: 'total' })).disponivel).toBe(false);
  });

  it('retirada de um envio republica os demais automaticamente', async () => {
    const a = await enviarEAprovar([linha({ quantidade: '40', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-30' })]);
    const b = await enviarEAprovar([linha({ quantidade: '25', periodo_inicio: '2026-05-01', periodo_fim: '2026-05-31' })]);
    const pub = await gerarPublicacao(gestor);
    await publicar(gestor, pub.id);
    expect((await consultarIndicadoresPublicos({ cubo: 'total', periodo: 'todos' })).celulas[0]?.valor).toBe(65);
    await executarAcao(gestor, a, 'retirar', { justificativa: 'Retirado após conferência com a entidade.' });
    const nova = await publicacaoAtual();
    expect(nova?.id).not.toBe(pub.id);
    expect((await consultarIndicadoresPublicos({ cubo: 'total', periodo: 'todos' })).celulas[0]?.valor).toBe(25);
    void b;
  });

  it('retirar a publicação vigente tira o portal do ar', async () => {
    const id2 = await enviarEAprovar([linha({ quantidade: '30' })]);
    const pub = await gerarPublicacao(gestor);
    await publicar(gestor, pub.id);
    expect((await consultarIndicadoresPublicos({ cubo: 'total', periodo: 'todos' })).celulas[0]?.valor).toBe(55); // 25 (envio anterior ainda ativo) + 30
    await expect(retirarPublicacao(gestor, pub.id, 'curto')).rejects.toMatchObject({ codigo: 'justificativa' });
    await retirarPublicacao(gestor, pub.id, 'Retirada para revisão metodológica.');
    expect((await consultarIndicadoresPublicos({ cubo: 'total' })).disponivel).toBe(false);
    void id2;
  });

  it('indicadores_publicados nunca guarda valor em células suprimidas', async () => {
    const lin = await db.select().from(indicadoresPublicados);
    expect(lin.length).toBeGreaterThan(0);
    expect(lin.filter((l) => l.suprimido && l.valor !== null)).toEqual([]);
  });
});
