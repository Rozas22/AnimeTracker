import { NextResponse } from 'next/server';
import {
  OAUTH_COOKIES,
  OAUTH_COOKIE_MAX_AGE,
  OAUTH_COOKIE_PATH,
  getAniListRedirectUri,
  safeReturnPath,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /auth/anilist → redirige a la pantalla de autorización de AniList. */
export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  const origin = url.origin;
  const clientId = process.env.ANILIST_CLIENT_ID || process.env.CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL('/entrar?error=config', origin));
  }

  const authorize = new URL('https://anilist.co/api/v2/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', getAniListRedirectUri(origin));
  authorize.searchParams.set('response_type', 'code');

  // Solo se acepta la vuelta de AniList en el navegador que empezó este inicio de sesión
  const state = crypto.randomUUID();
  authorize.searchParams.set('state', state);

  const res = NextResponse.redirect(authorize);
  const cookie = {
    path: OAUTH_COOKIE_PATH,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: url.protocol === 'https:',
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };
  res.cookies.set(OAUTH_COOKIES.state, state, cookie);
  const next = safeReturnPath(url.searchParams.get('next'));
  if (next) res.cookies.set(OAUTH_COOKIES.next, next, cookie);
  else res.cookies.set(OAUTH_COOKIES.next, '', { ...cookie, maxAge: 0 });
  return res;
}
