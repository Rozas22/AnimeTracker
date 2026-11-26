import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  OAUTH_COOKIES,
  OAUTH_COOKIE_PATH,
  SESSION_COOKIES,
  getAniListRedirectUri,
  safeReturnPath,
} from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';
import { GUEST_COOKIE, claimGuestPlay } from '@/lib/reto/guest';
import { NO_METRICS_COOKIE, countMetric } from '@/lib/metrics/server';
import { ADMIN_ANILIST_ID } from '@/lib/session-verify';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface ViewerResponse {
  data?: { Viewer?: { id: number; name: string; avatar?: { large?: string | null } | null } | null };
}

/**
 * GET /callback?code=… → canjea el código de AniList por un token, identifica
 * al usuario y guarda la sesión en cookies. Misma ruta que usaba la app anterior,
 * así la "Redirect URL" registrada en AniList sigue siendo válida.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  // Las cookies del inicio de sesión son de un solo uso, salga bien o mal
  const clearOAuth = (res: NextResponse): NextResponse => {
    for (const name of Object.values(OAUTH_COOKIES)) {
      res.cookies.set(name, '', { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    }
    return res;
  };
  const fail = (reason: string): NextResponse =>
    clearOAuth(NextResponse.redirect(new URL(`/entrar?error=${reason}`, origin)));

  if (!code) return fail('sin-codigo');

  // AniList no documenta si devuelve `state`: la cookie es obligatoria y, si
  // vuelve el valor, debe coincidir. Así un enlace ajeno no puede iniciar sesión.
  const cookieStore = cookies();
  const pendingState = cookieStore.get(OAUTH_COOKIES.state)?.value;
  const returnedState = url.searchParams.get('state');
  if (!pendingState) return fail('caducado');
  if (returnedState && returnedState !== pendingState) return fail('estado');
  const next = safeReturnPath(cookieStore.get(OAUTH_COOKIES.next)?.value) ?? '/';

  const clientId = process.env.ANILIST_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.ANILIST_CLIENT_SECRET || process.env.CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('config');

  try {
    const tokenRes = await fetch('https://anilist.co/api/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getAniListRedirectUri(origin),
        code,
      }),
      cache: 'no-store',
    });
    const token = (await tokenRes.json()) as TokenResponse;
    if (!tokenRes.ok || !token.access_token) return fail('token');

    const viewerRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token.access_token}`,
      },
      body: JSON.stringify({ query: '{ Viewer { id name avatar { large } } }' }),
      cache: 'no-store',
    });
    const viewer = ((await viewerRes.json()) as ViewerResponse).data?.Viewer;
    if (!viewer?.id) return fail('perfil');

    // Alta del usuario en la liga si es su primera vez (no pisa datos existentes)
    let isNewUser = false;
    try {
      const { data: created } = await createAdminClient()
        .from('users')
        .upsert({ anilist_id: viewer.id, username: viewer.name }, { onConflict: 'anilist_id', ignoreDuplicates: true })
        .select('anilist_id');
      isNewUser = Boolean(created?.length);
    } catch {
      /* el perfil se completa en la siguiente carga */
    }

    // Si jugó como invitado, la partida de ese día pasa a su cuenta una sola vez
    const guestCookie = cookieStore.get(GUEST_COOKIE)?.value;
    const guest = guestCookie ? await claimGuestPlay(guestCookie, viewer.id) : null;
    const guestDone = guest?.done ?? false;
    if (guest?.claimed) {
      await countMetric('guest_saved', 'all', viewer.id);
      if (isNewUser) await countMetric('signup_after_play', 'all', viewer.id);
    }

    const maxAge = Math.max(3600, Math.min(token.expires_in ?? 60 * 60 * 24 * 30, 60 * 60 * 24 * 365));
    const secure = url.protocol === 'https:';
    const res = clearOAuth(NextResponse.redirect(new URL(next, origin)));
    const base = { path: '/', sameSite: 'lax' as const, secure, maxAge };

    if (guestDone) res.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 });

    res.cookies.set(SESSION_COOKIES.token, token.access_token, { ...base, httpOnly: true });
    res.cookies.set(SESSION_COOKIES.id, String(viewer.id), { ...base, httpOnly: true });
    res.cookies.set(SESSION_COOKIES.name, viewer.name, base);
    if (viewer.avatar?.large) res.cookies.set(SESSION_COOKIES.avatar, viewer.avatar.large, base);
    // El navegador del administrador no cuenta en las métricas, aunque luego cierre sesión
    if (viewer.id === ADMIN_ANILIST_ID) {
      res.cookies.set(NO_METRICS_COOKIE, '1', { path: '/', sameSite: 'lax', secure, httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  } catch {
    return fail('red');
  }
}
