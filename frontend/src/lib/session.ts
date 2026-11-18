/** Cookies de sesión de KuramaTracker (OAuth de AniList). */
export const SESSION_COOKIES = {
  id: 'kurama_anilist_id',
  token: 'kurama_anilist_token',
  name: 'kurama_anilist_name',
  avatar: 'kurama_anilist_avatar',
} as const;

/**
 * URL a la que AniList devuelve al usuario tras autorizar.
 * Debe coincidir EXACTAMENTE con la "Redirect URL" del cliente en AniList
 * (AniList solo admite una por cliente). Ruta: /callback
 */
export function getAniListRedirectUri(origin: string): string {
  return process.env.ANILIST_REDIRECT_URI || `${origin}/callback`;
}
