import 'server-only';
import { NextResponse } from 'next/server';
import { ErroAcesso, ErroNegocio } from './erros';

export function comTratamento<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof ErroAcesso) return NextResponse.json({ erro: e.message }, { status: e.status });
      if (e instanceof ErroNegocio) return NextResponse.json({ erro: e.message, codigo: e.codigo }, { status: 422 });
      console.error('Erro inesperado na API', e);
      return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
    }
  };
}
