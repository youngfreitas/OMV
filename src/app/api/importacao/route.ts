import { NextResponse } from 'next/server';
import { comTratamento } from '@/lib/auth/http';
import { usuarioApi } from '@/lib/auth/guards';
import { LIMITE_BYTES } from '@/lib/importacao';
import { processarImportacao } from '@/server/importacao';

export const dynamic = 'force-dynamic';

export const POST = comTratamento(async (req: Request) => {
  const u = await usuarioApi('submissao:importar');
  const tam = Number(req.headers.get('content-length') ?? 0);
  if (tam > LIMITE_BYTES + 100_000) return NextResponse.json({ erro: 'Arquivo maior que o limite de 5 MB.' }, { status: 413 });
  const fd = await req.formData();
  const arq = fd.get('arquivo');
  if (!(arq instanceof File)) return NextResponse.json({ erro: 'Envie um arquivo no campo “arquivo”.' }, { status: 400 });
  const buffer = Buffer.from(await arq.arrayBuffer());
  const r = await processarImportacao(u, { nome: arq.name, mime: arq.type, buffer });
  return NextResponse.json(r, { status: r.ok ? 200 : 422 });
});

// Qualquer outro método → 405 autenticado (a verificação de sessão acontece antes via middleware).
export const GET = comTratamento(async () => {
  await usuarioApi('submissao:importar');
  return NextResponse.json({ erro: 'Método não permitido.' }, { status: 405 });
});
