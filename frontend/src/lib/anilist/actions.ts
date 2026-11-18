'use server';

import dns from 'node:dns';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { calculateLevel, resolveUnifiedUserLevel } from '@/lib/league';
import { fetchPublicAniListUserById } from '@/lib/auth';
import type {
  Media,
  MediaListEntry,
  MediaListCollection,
  AiringScheduleNode,
  AnimeSearchFilters,
  SaveMediaListEntryVariables,
  GraphQLResponse,
  PageInfo,
} from '@/types/anilist';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignorar si no aplica en entorno Edge
}

const ANILIST_ENDPOINT =
  process.env.NEXT_PUBLIC_ANILIST_GRAPHQL_URL || 'https://graphql.anilist.co';

export interface AniListActionResult<T> {
  data: T | null;
  error: string | null;
  rateLimited: boolean;
  fromFallback: boolean;
}

interface FetchAniListOptions {
  revalidateSeconds?: number;
  tags?: string[];
  accessToken?: string | null;
}

/**
 * Fragmento GraphQL estándar para Media optimizado para tarjetas y modales.
 */
const MEDIA_CORE_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  format
  status
  description(asHtml: false)
  season
  seasonYear
  episodes
  duration
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  genres
  averageScore
  meanScore
  popularity
  isAdult
  siteUrl
  nextAiringEpisode {
    id
    airingAt
    timeUntilAiring
    episode
  }
  externalLinks {
    id
    url
    site
    type
    language
    color
    icon
    isDisabled
  }
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
`;

/**
 * Ejecutor centralizado en Servidor hacia AniList GraphQL con:
 * 1. Caché nativa de Next.js (`next: { revalidate, tags }`) para evitar errores 429.
 * 2. Eliminación total de bloqueos CORS en el navegador.
 * 3. Manejo resiliente de cabeceras `Retry-After` ante picos de tráfico.
 */
async function executeAniListGraphQL<TData>(
  query: string,
  variables: Record<string, unknown> = {},
  options: FetchAniListOptions = {}
): Promise<AniListActionResult<TData>> {
  const { revalidateSeconds = 3600, tags = ['anilist'], accessToken = null } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      next: {
        revalidate: revalidateSeconds,
        tags,
      },
    });

    // Control explícito de Rate Limit (HTTP 429) de AniList
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') ?? '60';
      console.warn(
        `[AniList Proxy] Rate limit 429 detectado. Retry-After: ${retryAfter}s`
      );
      return {
        data: null,
        error: `AniList está recibiendo demasiadas peticiones. Reintentando automáticamente (espera ~${retryAfter}s).`,
        rateLimited: true,
        fromFallback: true,
      };
    }

    if (!response.ok) {
      return {
        data: null,
        error: `Error HTTP ${response.status} al consultar AniList.`,
        rateLimited: false,
        fromFallback: false,
      };
    }

    const json = (await response.json()) as GraphQLResponse<TData>;

    if (json.errors && json.errors.length > 0) {
      return {
        data: json.data,
        error: json.errors[0]?.message ?? 'Error en consulta GraphQL de AniList',
        rateLimited: false,
        fromFallback: false,
      };
    }

    return {
      data: json.data,
      error: null,
      rateLimited: false,
      fromFallback: false,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error:
        err instanceof Error
          ? err.message
          : 'Error de red al conectar con AniList desde el servidor',
      rateLimited: false,
      fromFallback: true,
    };
  }
}

// ─── 1. BUSCADOR Y CATÁLOGO CON CACHÉ DE 1 HORA (revalidate: 3600) ───────────

export interface CatalogSearchResponse {
  pageInfo: PageInfo;
  media: Media[];
}

export async function searchAnimeCatalogAction(
  filters: AnimeSearchFilters = {}
): Promise<AniListActionResult<CatalogSearchResponse>> {
  const {
    query: searchText,
    page = 1,
    perPage = 18,
    format,
    status,
    genre,
    season,
    seasonYear,
    sort = ['POPULARITY_DESC', 'SCORE_DESC'],
  } = filters;

  const graphqlQuery = `
    query SearchAnimeCatalog(
      $page: Int = 1
      $perPage: Int = 18
      $search: String
      $format: MediaFormat
      $status: MediaStatus
      $genre: String
      $season: MediaSeason
      $seasonYear: Int
      $sort: [MediaSort]
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        media(
          type: ANIME
          isAdult: false
          search: $search
          format: $format
          status: $status
          genre: $genre
          season: $season
          seasonYear: $seasonYear
          sort: $sort
        ) {
          ${MEDIA_CORE_FRAGMENT}
        }
      }
    }
  `;

  const variables: Record<string, unknown> = {
    page,
    perPage,
    sort,
  };

  if (searchText && searchText.trim().length > 0) {
    variables['search'] = searchText.trim();
  }
  if (format && format !== 'ALL') {
    variables['format'] = format;
  }
  if (status && status !== 'ALL') {
    variables['status'] = status;
  }
  if (genre && genre !== 'ALL') {
    variables['genre'] = genre;
  }
  if (season) {
    variables['season'] = season;
  }
  if (seasonYear) {
    variables['seasonYear'] = seasonYear;
  }

  const result = await executeAniListGraphQL<{ Page: CatalogSearchResponse }>(
    graphqlQuery,
    variables,
    {
      revalidateSeconds: 3600, // 1 hora en caché de servidor
      tags: ['anilist-catalog'],
    }
  );

  return {
    data: result.data?.Page ?? null,
    error: result.error,
    rateLimited: result.rateLimited,
    fromFallback: result.fromFallback,
  };
}

// ─── 2. COLECCIÓN DEL USUARIO CON CACHÉ DE 5 MIN (revalidate: 300) ──────────

export async function getUserAnimeCollectionAction(params: {
  userId?: number;
  userName?: string;
}): Promise<AniListActionResult<MediaListEntry[]>> {
  const { userId, userName } = params;

  if (!userId && !userName) {
    return {
      data: null,
      error: 'Se requiere userId o userName para consultar la colección.',
      rateLimited: false,
      fromFallback: false,
    };
  }

  const graphqlQuery = `
    query UserAnimeCollection($userId: Int, $userName: String) {
      MediaListCollection(userId: $userId, userName: $userName, type: ANIME) {
        lists {
          name
          isCustomList
          status
          entries {
            id
            mediaId
            status
            score(format: POINT_10_DECIMAL)
            progress
            repeat
            priority
            private
            notes
            updatedAt
            createdAt
            media {
              ${MEDIA_CORE_FRAGMENT}
            }
          }
        }
      }
    }
  `;

  const cacheTag = `anilist-collection-${userId ?? userName ?? 'default'}`;
  const result = await executeAniListGraphQL<{
    MediaListCollection: MediaListCollection;
  }>(
    graphqlQuery,
    { userId, userName },
    {
      revalidateSeconds: 300, // 5 minutos en caché de servidor para cambios de pestaña instantáneos
      tags: ['anilist-collection', cacheTag],
    }
  );

  if (!result.data?.MediaListCollection?.lists) {
    return {
      data: null,
      error: result.error,
      rateLimited: result.rateLimited,
      fromFallback: result.fromFallback,
    };
  }

  // Aplanar y deduplicar entradas por mediaId
  const seenMediaIds = new Set<number>();
  const flatEntries: MediaListEntry[] = [];

  for (const group of result.data.MediaListCollection.lists) {
    for (const entry of group.entries) {
      if (!seenMediaIds.has(entry.mediaId)) {
        seenMediaIds.add(entry.mediaId);
        flatEntries.push(entry);
      }
    }
  }

  return {
    data: flatEntries,
    error: null,
    rateLimited: false,
    fromFallback: false,
  };
}

// ─── 3. MUTACIÓN DE PROGRESO + SINCRONIZACIÓN DE PUNTOS EN SUPABASE ─────────

export interface UpdateProgressInput extends SaveMediaListEntryVariables {
  anilistUserId: number;
  totalEpisodesDelta?: number;
}

export async function saveAnimeProgressAction(
  input: UpdateProgressInput
): Promise<AniListActionResult<{ updatedProgress: number; newAnimePoints?: number }>> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('kurama_anilist_token')?.value ?? null;

  // 1. Si el usuario tiene token OAuth de AniList en cookies, sincronizar con AniList
  if (accessToken) {
    const mutation = `
      mutation SaveMediaListEntry(
        $mediaId: Int!
        $status: MediaListStatus
        $scoreRaw: Int
        $progress: Int
      ) {
        SaveMediaListEntry(
          mediaId: $mediaId
          status: $status
          scoreRaw: $scoreRaw
          progress: $progress
        ) {
          id
          mediaId
          status
          progress
          score
        }
      }
    `;

    await executeAniListGraphQL(
      mutation,
      {
        mediaId: input.mediaId,
        status: input.status,
        scoreRaw: input.scoreRaw,
        progress: input.progress,
      },
      {
        revalidateSeconds: 0,
        accessToken,
      }
    );
  }

  // 2. Sincronizar puntos de episodios (`anime_points`) y `level` en `public.users`
  if (input.anilistUserId && input.totalEpisodesDelta && input.totalEpisodesDelta !== 0) {
    const supabase = createClient();
    const { data: currentUser } = await supabase
      .from('users')
      .select('anime_points, level')
      .eq('anilist_id', input.anilistUserId)
      .maybeSingle();

    if (currentUser) {
      const nextAnimePoints = Math.max(
        0,
        (currentUser.anime_points || 0) + input.totalEpisodesDelta * 10
      );
      const totalEpisodes = Math.floor(nextAnimePoints / 10);
      const { computedLevel } = calculateLevel(totalEpisodes);

      await supabase
        .from('users')
        .update({
          anime_points: nextAnimePoints,
          level: computedLevel,
          last_updated_at: new Date().toISOString(),
        })
        .eq('anilist_id', input.anilistUserId);
    }
  }

  // 3. Revalidar únicamente la colección del usuario
  revalidateTag(`anilist-collection-${input.anilistUserId}`);
  revalidateTag('anilist-collection');

  return {
    data: {
      updatedProgress: input.progress ?? 0,
    },
    error: null,
    rateLimited: false,
    fromFallback: false,
  };
}

// ─── 4. SINCRONIZACIÓN FORZADA ANILIST ↔ SUPABASE (AJUSTES) ─────────────────

export interface SyncAccountResult {
  anilistId: number;
  username: string;
  avatarUrl: string | null;
  episodesWatched: number;
  computedLevel: number;
  animePoints: number;
  syncedAt: string;
}

export async function syncAccountWithAniListAction(
  anilistUserId: number
): Promise<AniListActionResult<SyncAccountResult>> {
  try {
    revalidateTag('anilist-viewer');
    revalidateTag(`anilist-user-${anilistUserId}`);
    revalidateTag(`anilist-collection-${anilistUserId}`);

    const supabase = createClient();
    const [anilistUser, { data: existingRow }] = await Promise.all([
      fetchPublicAniListUserById(anilistUserId),
      supabase
        .from('users')
        .select('*')
        .eq('anilist_id', anilistUserId)
        .maybeSingle(),
    ]);

    const unified = resolveUnifiedUserLevel({
      anilistEpisodesWatched: anilistUser?.statistics?.anime?.episodesWatched,
      supabaseAnimePoints: existingRow?.anime_points,
      supabaseStoredLevel: existingRow?.level,
    });

    const syncedAt = new Date().toISOString();
    const resolvedUsername =
      anilistUser?.name ?? existingRow?.username ?? `Usuario #${anilistUserId}`;

    await supabase.from('users').upsert(
      {
        anilist_id: anilistUserId,
        username: resolvedUsername,
        anime_points: unified.totalAnimePoints,
        level: unified.computedLevel,
        last_updated_at: syncedAt,
      },
      { onConflict: 'anilist_id' }
    );

    revalidatePath('/');
    revalidatePath('/arena');
    revalidatePath('/grupo');
    revalidatePath('/ajustes');

    return {
      data: {
        anilistId: anilistUserId,
        username: resolvedUsername,
        avatarUrl:
          anilistUser?.avatar?.large ?? anilistUser?.avatar?.medium ?? null,
        episodesWatched: unified.totalEpisodesWatched,
        computedLevel: unified.computedLevel,
        animePoints: unified.totalAnimePoints,
        syncedAt,
      },
      error: null,
      rateLimited: false,
      fromFallback: false,
    };
  } catch (err: unknown) {
    return {
      data: null,
      error:
        err instanceof Error
          ? err.message
          : 'Error al sincronizar cuenta con AniList y Supabase',
      rateLimited: false,
      fromFallback: false,
    };
  }
}

export async function updateProfileVisibilityAction(params: {
  anilistUserId: number;
  visibility: 'public' | 'friends' | 'private';
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('users')
    .update({
      profile_visibility: params.visibility,
      last_updated_at: new Date().toISOString(),
    })
    .eq('anilist_id', params.anilistUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/grupo');
  revalidatePath('/ajustes');

  return { success: true, error: null };
}

// ─── 5. CALENDARIO SEMANAL DE EMISIÓN REAL Y VALIDADO (revalidate: 1800) ────

export async function getWeeklyAiringScheduleAction(): Promise<
  AniListActionResult<AiringScheduleNode[]>
> {
  // Ventana de 7 días que cubre toda la semana en curso
  const nowSec = Math.floor(Date.now() / 1000);
  const startWindowSec = nowSec - 86400; // Desde hace 24h para cubrir el día actual completo
  const endWindowSec = nowSec + 7 * 86400; // Hasta dentro de 7 días

  const airingQuery = `
    query WeeklyAiringSchedules($start: Int!, $end: Int!, $page: Int = 1) {
      Page(page: $page, perPage: 50) {
        pageInfo {
          hasNextPage
        }
        airingSchedules(
          airingAt_greater: $start
          airingAt_lesser: $end
          sort: [TIME]
        ) {
          id
          airingAt
          timeUntilAiring
          episode
          mediaId
          media {
            id
            idMal
            title {
              romaji
              english
              native
              userPreferred
            }
            format
            status
            description(asHtml: false)
            season
            seasonYear
            episodes
            duration
            coverImage {
              extraLarge
              large
              medium
              color
            }
            bannerImage
            genres
            averageScore
            meanScore
            popularity
            favourites
            isAdult
            siteUrl
          }
        }
      }
    }
  `;

  const [page1Res, page2Res] = await Promise.all([
    executeAniListGraphQL<{
      Page: { airingSchedules: AiringScheduleNode[] };
    }>(
      airingQuery,
      { start: startWindowSec, end: endWindowSec, page: 1 },
      { revalidateSeconds: 1800, tags: ['anilist-airing-schedule'] }
    ),
    executeAniListGraphQL<{
      Page: { airingSchedules: AiringScheduleNode[] };
    }>(
      airingQuery,
      { start: startWindowSec, end: endWindowSec, page: 2 },
      { revalidateSeconds: 1800, tags: ['anilist-airing-schedule'] }
    ),
  ]);

  const rawSchedules: AiringScheduleNode[] = [
    ...(page1Res.data?.Page?.airingSchedules ?? []),
    ...(page2Res.data?.Page?.airingSchedules ?? []),
  ];

  // VALIDACIÓN ESTRICTA:
  // 1. Excluir cualquier anime con estado FINISHED, CANCELLED, HIATUS o NOT_YET_RELEASED (solo RELEASING real).
  // 2. Excluir contenido para adultos (isAdult).
  // 3. Exigir póster oficial válido (coverImage.large o coverImage.medium).
  // 4. Priorizar series con tracción real (popularity >= 1500) y deduplicar por mediaId + episode.
  const seenKeys = new Set<string>();
  const validatedSchedules: AiringScheduleNode[] = [];

  for (const item of rawSchedules) {
    const media = item.media;
    if (!media) continue;
    if (media.status !== 'RELEASING') continue;
    if (media.isAdult) continue;

    const posterUrl =
      media.coverImage?.extraLarge ||
      media.coverImage?.large ||
      media.coverImage?.medium;
    if (!posterUrl) continue;

    if ((media.popularity ?? 0) < 1500) continue;

    const uniqueKey = `${item.mediaId}-${item.episode}`;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    validatedSchedules.push(item);
  }

  return {
    data: validatedSchedules,
    error: page1Res.error,
    rateLimited: page1Res.rateLimited,
    fromFallback: page1Res.fromFallback,
  };
}
