import { NextResponse } from 'next/server';
import { registrar } from '@/lib/auditoria';
import { comTratamento } from '@/lib/auth/http';
import { usuarioApi } from '@/lib/auth/guards';
import { FORMATOS, MIME, NOME_ARQUIVO, gerarModelo, type FormatoModelo } from '@/lib/modelos';
import { carregarBairros, carregarDominios } from '@/server/cadastros';

export const dynamic = 'force-dynamic';

export const GET = comTratamento(async (_req: Request, ctx: { params: Promise<{ formato: string }> }) => {
  const u = await usuarioApi('submissao:criar', 'submissao:importar', 'analise:ler');
  const { formato } = await ctx.params;
  if (!(FORMATOS as string[]).includes(formato)) return NextResponse.json({ erro: 'Formato inexistente.' }, { status: 404 });
  const f = formato as FormatoModelo;
  const [dominios, bairros] = await Promise.all([carregarDominios(), carregarBairros()]);
  const buf = await gerarModelo(f, { dominios, bairros: bairros.map((b) => b.nome) });
  await registrar({ usuarioId: u.id, entidadeId: u.entidadeId, acao: 'modelo.baixado', detalhes: { formato: f } });
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': MIME[f],
      'Content-Disposition': `attachment; filename="${NOME_ARQUIVO[f]}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
