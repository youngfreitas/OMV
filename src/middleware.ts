import { NextResponse, type NextRequest } from 'next/server';

const COOKIE = 'omv_sessao';

/** Rotas acessíveis sem sessão (visitante). Tudo o mais exige cookie de sessão — defesa em profundidade:
 *  cada página, ação e rota valida a sessão de verdade no servidor. */
const PUBLICAS = [/^\/$/, /^\/mapa(\/|$)/, /^\/entrar(\/|$)/, /^\/recuperar-senha(\/|$)/, /^\/acesso-negado$/, /^\/api\/publico(\/|$)/];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((r) => r.test(pathname))) return NextResponse.next();
  if (req.cookies.get(COOKIE)?.value) return NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Autenticação necessária.' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/entrar';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|marca/|favicon.ico|robots.txt).*)'],
};
