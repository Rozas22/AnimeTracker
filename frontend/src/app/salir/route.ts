import { NextResponse } from 'next/server';
import { SESSION_COOKIES } from '@/lib/session';

/** GET /salir → cierra la sesión y vuelve a la pantalla de entrada. */
export function GET(request: Request): NextResponse {
  const res = NextResponse.redirect(new URL('/entrar', request.url));
  for (const name of Object.values(SESSION_COOKIES)) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return res;
}
