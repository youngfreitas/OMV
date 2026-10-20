import { NextResponse } from 'next/server';
import { dentroDoLimite } from '@/lib/http/limite';
import { geoPublico } from '@/server/publico';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  if (!dentroDoLimite(`geo:${ip}`)) return NextResponse.json({ erro: 'Muitas requisições.' }, { status: 429 });
  return NextResponse.json(await geoPublico(), { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' } });
}
