import { NextResponse } from 'next/server';
import { getAniListRedirectUri } from '@/lib/session';

/** GET /auth/anilist → redirige a la pantalla de autorización de AniList. */
export function GET(request: Request): NextResponse {
  const origin = new URL(request.url).origin;
  const clientId = process.env.ANILIST_CLIENT_ID || process.env.CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL('/entrar?error=config', origin));
  }

  const authorize = new URL('https://anilist.co/api/v2/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', getAniListRedirectUri(origin));
  authorize.searchParams.set('response_type', 'code');
  return NextResponse.redirect(authorize);
}
