import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { UserProfileRow, UserAchievementRow, TablesInsert } from '@/types/database';
import type { AniListUser, GraphQLResponse } from '@/types/anilist';

const ADMIN_ANILIST_ID = Number(process.env.NEXT_PUBLIC_ADMIN_ANILIST_ID ?? 7952169);

export interface AuthenticatedKuramaUser {
  anilistId: number;
  isAdmin: boolean;
  profile: UserProfileRow | null;
  achievements: UserAchievementRow[];
  anilistViewer: AniListUser | null;
}

/**
 * Verifica si un ID de AniList corresponde al administrador de KuramaTracker.
 */
export function isAdminUser(anilistId: number | string | null | undefined): boolean {
  if (anilistId === null || anilistId === undefined) return false;
  return Number(anilistId) === ADMIN_ANILIST_ID;
}

/**
 * Obtiene el usuario autenticado de AniList usando el token guardado en cookies (Server-side).
 */
export async function fetchAniListViewerFromToken(
  accessToken: string
): Promise<AniListUser | null> {
  const query = `
    query ViewerProfile {
      Viewer {
        id
        name
        about
        avatar {
          large
          medium
        }
        bannerImage
        siteUrl
        updatedAt
        statistics {
          anime {
            count
            meanScore
            standardDeviation
            minutesWatched
            episodesWatched
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 120, tags: ['anilist-viewer'] },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as GraphQLResponse<{ Viewer: AniListUser }>;
    return json.data?.Viewer ?? null;
  } catch {
    return null;
  }
}

/**
 * Recupera en el Servidor el perfil completo del usuario autenticado
 * cruzando la sesión (Supabase Auth o Cookie OAuth de AniList) con la tabla `public.users`.
 */
export async function getServerAuthenticatedUser(): Promise<AuthenticatedKuramaUser | null> {
  const cookieStore = cookies();
  const supabase = createClient();

  let resolvedAniListId: number | null = null;
  let anilistViewer: AniListUser | null = null;

  // 1. Intentar resolver desde Supabase Auth (user_metadata.anilist_id)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const metaAniListId = authUser?.user_metadata?.['anilist_id'] as
    | number
    | string
    | undefined;

  if (metaAniListId && !Number.isNaN(Number(metaAniListId))) {
    resolvedAniListId = Number(metaAniListId);
  }

  // 2. Intentar resolver desde cookies de sesión OAuth de AniList
  const anilistIdCookie = cookieStore.get('kurama_anilist_id')?.value;
  const anilistTokenCookie = cookieStore.get('kurama_anilist_token')?.value;

  if (!resolvedAniListId && anilistIdCookie && !Number.isNaN(Number(anilistIdCookie))) {
    resolvedAniListId = Number(anilistIdCookie);
  }

  if (anilistTokenCookie) {
    anilistViewer = await fetchAniListViewerFromToken(anilistTokenCookie);
    if (!resolvedAniListId && anilistViewer?.id) {
      resolvedAniListId = anilistViewer.id;
    }
  }

  if (!resolvedAniListId) {
    return null;
  }

  // 3. Consultar fila en `public.users` y logros en `public.user_achievements`
  const [{ data: profile }, { data: achievements }] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('anilist_id', resolvedAniListId)
      .maybeSingle(),
    supabase
      .from('user_achievements')
      .select('*')
      .eq('anilist_id', resolvedAniListId)
      .order('awarded_at', { ascending: false }),
  ]);

  return {
    anilistId: resolvedAniListId,
    isAdmin: isAdminUser(resolvedAniListId),
    profile: profile ?? null,
    achievements: achievements ?? [],
    anilistViewer,
  };
}

/**
 * Sincroniza o crea el registro del usuario en la tabla `public.users` tras autenticarse con AniList.
 */
export async function upsertSupabaseUserProfile(
  payload: TablesInsert<'users'>
): Promise<UserProfileRow | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        ...payload,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'anilist_id' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('[Auth] Error sincronizando perfil en public.users:', error.message);
    return null;
  }

  return data;
}
