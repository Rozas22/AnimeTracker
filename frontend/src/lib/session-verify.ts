/**
 * Verificación de identidad independiente de Next (usable en route handlers,
 * server actions y en las rutas de `pages/api`).
 *
 * La única prueba de identidad válida es el token OAuth de AniList: se consulta
 * `Viewer { id }` a AniList y se cachea en memoria. Las cookies con el id
 * (`kurama_anilist_id`) NO prueban nada: cualquiera puede enviarlas.
 */

export const ADMIN_ANILIST_ID = Number(process.env.NEXT_PUBLIC_ADMIN_ANILIST_ID ?? 7952169);
export const TOKEN_COOKIE = 'kurama_anilist_token';

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { id: number; exp: number }>();

/** Devuelve el anilist_id dueño del token, o null si el token no es válido. */
export async function verifyAniListToken(token: string | null | undefined): Promise<number | null> {
  if (!token || token.length < 20) return null;

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return hit.id;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: '{ Viewer { id } }' }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { Viewer?: { id?: number } | null } };
    const id = json.data?.Viewer?.id;
    if (typeof id !== 'number') return null;

    if (cache.size > 1000) cache.clear();
    cache.set(token, { id, exp: Date.now() + TTL_MS });
    return id;
  } catch {
    return null;
  }
}

/** Lee una cookie de una cabecera `Cookie` cruda (para pages/api). */
export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
