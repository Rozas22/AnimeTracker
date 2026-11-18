import dns from 'node:dns';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { resolveUnifiedUserLevel, type UnifiedLevelSnapshot } from '@/lib/league';
import type { UserProfileRow, UserAchievementRow, TablesInsert } from '@/types/database';
import type { AniListUser, GraphQLResponse } from '@/types/anilist';

// Evitar timeouts IPv6 de Node.js/undici en Windows al conectar con graphql.anilist.co
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignorar en entornos Edge donde node:dns no aplique
}

const ADMIN_ANILIST_ID = Number(process.env.NEXT_PUBLIC_ADMIN_ANILIST_ID ?? 7952169);

export interface AuthenticatedKuramaUser {
  anilistId: number;
  isAdmin: boolean;
  profile: UserProfileRow | null;
  achievements: UserAchievementRow[];
  anilistViewer: AniListUser | null;
  unifiedLevel: UnifiedLevelSnapshot;
}

const ANILIST_USER_FIELDS = `
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
      statuses {
        count
        meanScore
        minutesWatched
        episodesWatched
        status
      }
      genres {
        count
        meanScore
        minutesWatched
        episodesWatched
        genre
      }
    }
  }
`;

/**
 * Verifica si un ID de AniList corresponde al administrador de KuramaTracker.
 */
export function isAdminUser(anilistId: number | string | null | undefined): boolean {
  if (anilistId === null || anilistId === undefined) return false;
  return Number(anilistId) === ADMIN_ANILIST_ID;
}

/**
 * Obtiene el usuario autenticado de AniList usando el token OAuth guardado en cookies.
 */
export async function fetchAniListViewerFromToken(
  accessToken: string
): Promise<AniListUser | null> {
  const query = `
    query ViewerProfile {
      Viewer {
        ${ANILIST_USER_FIELDS}
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
      next: { revalidate: 300, tags: ['anilist-viewer'] },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as GraphQLResponse<{ Viewer: AniListUser }>;
    return json.data?.Viewer ?? null;
  } catch {
    return null;
  }
}

/**
 * Obtiene los datos públicos de un usuario de AniList por su `id` (Avatar, Banner y Estadísticas reales)
 * con caché en servidor de 10 minutos para evitar errores 429.
 */
export async function fetchPublicAniListUserById(
  anilistId: number
): Promise<AniListUser | null> {
  const query = `
    query PublicUserProfile($id: Int!) {
      User(id: $id) {
        ${ANILIST_USER_FIELDS}
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables: { id: anilistId } }),
      next: { revalidate: 600, tags: ['anilist-viewer', `anilist-user-${anilistId}`] },
    });

    if (!response.ok) return null;

    const json = (await response.json()) as GraphQLResponse<{ User: AniListUser }>;
    return json.data?.User ?? null;
  } catch {
    return null;
  }
}

/**
 * Recupera en el Servidor el perfil completo del usuario autenticado
 * cruzando la sesión con `public.users` y con la API de AniList,
 * y unificando el Nivel (`resolveUnifiedUserLevel`) como única fuente de verdad.
 */
export async function getServerAuthenticatedUser(): Promise<AuthenticatedKuramaUser> {
  const cookieStore = cookies();
  const supabase = createClient();

  let resolvedAniListId: number | null = null;
  let anilistViewer: AniListUser | null = null;

  // 1. Intentar resolver desde Supabase Auth
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

  // 2. Intentar resolver desde cookies OAuth de AniList
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

  // 3. Solo en desarrollo local y sin sesión: usar la cuenta principal para poder maquetar.
  //    En producción el middleware ya manda a /entrar a quien no tiene sesión.
  if (!resolvedAniListId) {
    if (process.env.NODE_ENV !== 'production') {
      resolvedAniListId = ADMIN_ANILIST_ID;
    } else {
      throw new Error('Sesión no encontrada');
    }
  }

  // 4. Consultar en paralelo Supabase (`users` + `user_achievements`) y el perfil real de AniList
  const [{ data: profileRow }, { data: achievements }, publicAniListUser] =
    await Promise.all([
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
      anilistViewer
        ? Promise.resolve(anilistViewer)
        : fetchPublicAniListUserById(resolvedAniListId),
    ]);

  const finalAniListViewer = anilistViewer ?? publicAniListUser;

  // 5. Calcular el Nivel Unificado (Única Fuente de Verdad entre AniList y Supabase)
  const unifiedLevel = resolveUnifiedUserLevel({
    anilistEpisodesWatched: finalAniListViewer?.statistics?.anime?.episodesWatched,
    supabaseAnimePoints: profileRow?.anime_points,
    supabaseStoredLevel: profileRow?.level,
  });

  // 6. Si el nivel o los puntos de episodios en Supabase estaban desactualizados, sincronizarlos
  let finalProfile = profileRow ?? null;
  if (
    finalProfile &&
    (finalProfile.level !== unifiedLevel.computedLevel ||
      finalProfile.anime_points !== unifiedLevel.totalAnimePoints)
  ) {
    const { data: syncedRow } = await supabase
      .from('users')
      .update({
        level: unifiedLevel.computedLevel,
        anime_points: unifiedLevel.totalAnimePoints,
        username: finalAniListViewer?.name ?? finalProfile.username,
        last_updated_at: new Date().toISOString(),
      })
      .eq('anilist_id', resolvedAniListId)
      .select('*')
      .maybeSingle();

    if (syncedRow) {
      finalProfile = syncedRow;
    } else {
      finalProfile = {
        ...finalProfile,
        level: unifiedLevel.computedLevel,
        anime_points: unifiedLevel.totalAnimePoints,
      };
    }
  }

  return {
    anilistId: resolvedAniListId,
    isAdmin: isAdminUser(resolvedAniListId),
    profile: finalProfile,
    achievements: achievements ?? [],
    anilistViewer: finalAniListViewer,
    unifiedLevel,
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
