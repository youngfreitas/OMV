import { NextResponse } from 'next/server';
import { dentroDoLimite } from '@/lib/http/limite';
import { consultarIndicadoresPublicos } from '@/server/publico';

export const dynamic = 'force-dynamic';

/** API pública: lê SOMENTE indicadores_publicados (ou a fonte demonstrativa fictícia). */
export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  if (!dentroDoLimite(`ind:${ip}`)) return NextResponse.json({ erro: 'Muitas requisições. Tente novamente em instantes.' }, { status: 429 });
  const p = new URL(req.url).searchParams;
  const filtros = ['territorio', 'categoria', 'faixa', 'tipo'].filter((d) => p.get(d));
  const r = await consultarIndicadoresPublicos({
    cubo: p.get('cubo') ?? undefined,
    unidade: p.get('unidade') ?? undefined,
    periodo: p.get('periodo') ?? undefined,
    filtros,
  });
  return NextResponse.json(r, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
}
