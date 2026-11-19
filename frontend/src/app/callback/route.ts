import { NextResponse } from 'next/server';
import { SESSION_COOKIES, getAniListRedirectUri } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/server';

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
  const fail = (reason: string): NextResponse => NextResponse.redirect(new URL(`/entrar?error=${reason}`, origin));

  if (!code) return fail('sin-codigo');

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
    try {
      await createAdminClient()
        .from('users')
        .upsert({ anilist_id: viewer.id, username: viewer.name }, { onConflict: 'anilist_id', ignoreDuplicates: true });
    } catch {
      /* el perfil se completa en la siguiente carga */
    }

    const maxAge = Math.max(3600, Math.min(token.expires_in ?? 60 * 60 * 24 * 30, 60 * 60 * 24 * 365));
    const secure = url.protocol === 'https:';
    const res = NextResponse.redirect(new URL('/', origin));
    const base = { path: '/', sameSite: 'lax' as const, secure, maxAge };

    res.cookies.set(SESSION_COOKIES.token, token.access_token, { ...base, httpOnly: true });
    res.cookies.set(SESSION_COOKIES.id, String(viewer.id), { ...base, httpOnly: true });
    res.cookies.set(SESSION_COOKIES.name, viewer.name, base);
    if (viewer.avatar?.large) res.cookies.set(SESSION_COOKIES.avatar, viewer.avatar.large, base);
    return res;
  } catch {
    return fail('red');
  }
}
