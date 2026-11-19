import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_ANILIST_ID, TOKEN_COOKIE, verifyAniListToken } from '@/lib/session-verify';

/**
 * anilist_id VERIFICADO de quien hace la petición (server actions / route handlers).
 * 1) token de AniList de la cookie, comprobado contra AniList;
 * 2) sesión de Supabase Auth (firmada por Supabase);
 * 3) solo en desarrollo local, la cuenta de pruebas.
 * Nunca usa ids enviados por el navegador.
 */
export async function getVerifiedAniListId(): Promise<number | null> {
  const token = cookies().get(TOKEN_COOKIE)?.value ?? null;
  const fromToken = await verifyAniListToken(token);
  if (fromToken) return fromToken;

  try {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    const meta = user?.user_metadata?.['anilist_id'] as number | string | undefined;
    if (meta && !Number.isNaN(Number(meta))) return Number(meta);
  } catch {
    /* sin sesión de Supabase */
  }

  if (process.env.NODE_ENV !== 'production') return ADMIN_ANILIST_ID;
  return null;
}

export async function isVerifiedAdmin(): Promise<boolean> {
  return (await getVerifiedAniListId()) === ADMIN_ANILIST_ID;
}
