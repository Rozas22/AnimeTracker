import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sin sesión, todas las pantallas llevan a /entrar.
 * La sesión es la cookie de AniList (kurama_anilist_id) o una sesión de Supabase Auth.
 */
export function middleware(request: NextRequest): NextResponse {
  // En `next dev` (localhost) se entra con la cuenta de desarrollo de lib/auth.ts:
  // el login de AniList solo puede volver a la Redirect URL de producción.
  if (process.env.NODE_ENV !== 'production') return NextResponse.next();

  const hasAniList = Boolean(request.cookies.get('kurama_anilist_id')?.value);
  const hasSupabase = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));

  if (hasAniList || hasSupabase) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/entrar';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // Todo menos: entrar/login, API, estáticos y archivos de la PWA
  matcher: [
    '/((?!entrar|privacidad|reto|unirse|arena/reto|auth|callback|salir|api|_next|favicon|icon-|apple-touch-icon|logo|manifest|sw\\.js|robots|sitemap|frames|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|txt|xml|js)$).*)',
  ],
};
