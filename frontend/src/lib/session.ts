/** Cookies de sesión de KuramaTracker (OAuth de AniList). */
export const SESSION_COOKIES = {
  id: 'kurama_anilist_id',
  token: 'kurama_anilist_token',
  name: 'kurama_anilist_name',
  avatar: 'kurama_anilist_avatar',
} as const;

/** Cookies temporales del inicio de sesión, visibles solo para /callback. */
export const OAUTH_COOKIES = {
  state: 'kurama_oauth_state',
  next: 'kurama_oauth_next',
} as const;
export const OAUTH_COOKIE_PATH = '/callback';
export const OAUTH_COOKIE_MAX_AGE = 600;

const NO_RETURN = ['/entrar', '/auth', '/callback', '/salir', '/api'];

/** Acepta solo rutas internas para volver tras iniciar sesión (nunca otra web). */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 200 || !raw.startsWith('/') || raw.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  try {
    const parsed = new URL(raw, 'https://kuramatracker.invalid');
    if (parsed.origin !== 'https://kuramatracker.invalid') return null;
    if (NO_RETURN.some((p) => parsed.pathname === p || parsed.pathname.startsWith(`${p}/`))) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/**
 * URL a la que AniList devuelve al usuario tras autorizar.
 * Debe coincidir EXACTAMENTE con la "Redirect URL" del cliente en AniList
 * (AniList solo admite una por cliente). Ruta: /callback
 */
export function getAniListRedirectUri(origin: string): string {
  return process.env.ANILIST_REDIRECT_URI || `${origin}/callback`;
}
