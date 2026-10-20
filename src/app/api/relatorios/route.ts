import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db/client';
import { relatoriosGerados } from '@/lib/db/schema';
import { registrar } from '@/lib/auditoria';
import { comTratamento } from '@/lib/auth/http';
import { usuarioApi } from '@/lib/auth/guards';
import { gerarPdf } from '@/lib/relatorios/pdf';
import { gerarXlsxRelatorio } from '@/lib/relatorios/xlsx';
import { painelDados } from '@/server/dados';

export const dynamic = 'force-dynamic';

export const GET = comTratamento(async (req: Request) => {
  const u = await usuarioApi('relatorio:exportar');
  const q = new URL(req.url).searchParams;
  const formato = q.get('formato') === 'xlsx' ? 'xlsx' : 'pdf';
  const painel = await painelDados(u, { unidade: q.get('unidade') ?? undefined, periodo: q.get('periodo') ?? undefined });
  if (!painel.disponivel) return NextResponse.json({ erro: painel.mensagem ?? 'Sem dados para o relatório.' }, { status: 422 });
  const dados = { painel, unidadeRotulo: painel.unidades.find((x) => x.codigo === painel.unidade)?.rotulo ?? painel.unidade, geradoEm: new Date(), geradoPor: u.nome };
  const buf = formato === 'pdf' ? await gerarPdf(dados) : await gerarXlsxRelatorio(dados);
  const sha = createHash('sha256').update(buf).digest('hex');
  await db.insert(relatoriosGerados).values({ usuarioId: u.id, tipo: 'indicadores', formato, parametros: { unidade: painel.unidade, periodo: painel.periodo, restrito: painel.restrito }, tamanho: buf.length, sha256: sha });
  await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'relatorio.exportado', detalhes: { formato, unidade: painel.unidade, periodo: painel.periodo, semSupressao: !painel.restrito } });
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="omv-relatorio-${painel.unidade}-${painel.periodo}.${formato}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
