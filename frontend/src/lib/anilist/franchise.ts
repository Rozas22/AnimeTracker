'use server';

import { getVerifiedAniListId } from '@/lib/session-server';
import { getUserAnimeCollectionAction } from './actions';
import type { MediaFormat, MediaListStatus } from '@/types/anilist';

const ANILIST_ENDPOINT = process.env.NEXT_PUBLIC_ANILIST_GRAPHQL_URL || 'https://graphql.anilist.co';

/** Formatos que cuentan como "temporada" de una saga (fuera OVAs, especiales y música). */
const SEASON_FORMATS: ReadonlySet<string> = new Set(['TV', 'TV_SHORT', 'ONA', 'MOVIE']);
/** Formatos por los que se puede pasar para no romper la cadena, aunque no se muestren
 *  (p. ej. Slime T1 → OVA → T2). */
const BRIDGE_FORMATS: ReadonlySet<string> = new Set(['TV', 'TV_SHORT', 'ONA', 'MOVIE', 'OVA', 'SPECIAL']);
const MAX_VISITED = 32;
const MAX_HOPS = 14;

export interface FranchiseEntry {
  mediaId: number;
  title: string;
  format: MediaFormat | null;
  year: number | null;
  episodes: number | null;
  /** Media de AniList sobre 10, o null si no hay. */
  averageScore: number | null;
  /** Tu nota sobre 10 (null = sin nota). */
  myScore: number | null;
  myStatus: MediaListStatus | null;
  myProgress: number | null;
}

interface RelationNode {
  id: number;
  type: string | null;
  format: string | null;
}

interface FranchiseMedia {
  id: number;
  format: MediaFormat | null;
  episodes: number | null;
  averageScore: number | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
  title: { userPreferred: string | null; romaji: string | null; english: string | null };
}

async function gql<T>(query: string, variables: Record<string, unknown>, opts: { revalidate: number }): Promise<T | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  try {
    const res = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      next: { revalidate: opts.revalidate, tags: ['anilist-franchise'] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

const MEDIA_FIELDS = `
  id
  type
  format
  episodes
  averageScore
  startDate { year month day }
  title { userPreferred romaji english }
`;

/** Cada petición trae el anime, sus vecinos con datos y los vecinos de estos (solo id),
 *  así se avanzan dos temporadas por petición (AniList limita a ~30 peticiones/min). */
const MEDIA_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        ${MEDIA_FIELDS}
        relations {
          edges {
            relationType
            node {
              ${MEDIA_FIELDS}
              relations { edges { relationType node { id type format } } }
            }
          }
        }
      }
    }
  }
`;

type Edge<N> = { relationType: string | null; node: N | null };
type NeighbourMedia = FranchiseMedia & { type: string | null; relations: { edges: Array<Edge<RelationNode>> } | null };
type RootMedia = FranchiseMedia & { type: string | null; relations: { edges: Array<Edge<NeighbourMedia>> } | null };

function chainEdges<N extends RelationNode>(edges: Array<Edge<N>> | undefined): N[] {
  return (edges ?? [])
    .filter((e) => (e.relationType === 'SEQUEL' || e.relationType === 'PREQUEL') && e.node)
    .map((e) => e.node as N)
    .filter((n) => n.type === 'ANIME' && !!n.format && BRIDGE_FORMATS.has(n.format));
}

/**
 * Recorre la cadena PRECUELA/SECUELA de un anime y devuelve sus temporadas en
 * orden de emisión, con tu nota de cada una y la media de AniList.
 */
export async function getFranchiseScoresAction(mediaId: number): Promise<FranchiseEntry[]> {
  const startId = Math.trunc(mediaId);
  if (!Number.isFinite(startId) || startId <= 0) return [];

  const found = new Map<number, FranchiseMedia>();
  const expanded = new Set<number>();
  let frontier = [startId];

  for (let hop = 0; hop < MAX_HOPS && frontier.length > 0; hop++) {
    frontier.forEach((id) => expanded.add(id));
    const data = await gql<{ Page: { media: RootMedia[] } }>(MEDIA_QUERY, { ids: frontier }, { revalidate: 86_400 });
    if (!data) break;
    const next = new Set<number>();
    for (const m of data.Page.media) {
      found.set(m.id, m);
      for (const n of chainEdges(m.relations?.edges)) {
        found.set(n.id, n);
        // Los vecinos ya tienen datos; se expanden sus propios vecinos.
        expanded.add(n.id);
        for (const nn of chainEdges(n.relations?.edges)) {
          if (!found.has(nn.id) && !expanded.has(nn.id)) next.add(nn.id);
        }
      }
    }
    // Un vecino visto en esta vuelta puede ser también "vecino de vecino" de otro.
    frontier = Array.from(next).filter((id) => !found.has(id)).slice(0, MAX_VISITED);
    if (found.size >= MAX_VISITED) break;
  }

  const medias = Array.from(found.values()).filter((m) => m.id === startId || (m.format && SEASON_FORMATS.has(m.format)));
  if (medias.length === 0) return [];

  const dateKey = (m: FranchiseMedia): number => {
    const d = m.startDate;
    return (d?.year ?? 9999) * 10_000 + (d?.month ?? 12) * 100 + (d?.day ?? 31);
  };
  medias.sort((a, b) => dateKey(a) - dateKey(b) || a.id - b.id);

  // Tus notas salen de tu colección, que ya está en caché (la misma que usan Mi Lista
  // y el inicio, y se refresca al guardar), así que no gasta peticiones extra.
  const mine = new Map<number, { status: MediaListStatus; progress: number; score: number }>();
  const userId = await getVerifiedAniListId();
  if (userId) {
    const collection = await getUserAnimeCollectionAction({ userId });
    for (const row of collection.data ?? []) mine.set(row.mediaId, row);
  }

  return medias.map((m) => {
    const own = mine.get(m.id);
    return {
      mediaId: m.id,
      title: m.title.userPreferred || m.title.romaji || m.title.english || 'Anime',
      format: m.format,
      year: m.startDate?.year ?? null,
      episodes: m.episodes,
      averageScore: m.averageScore ? m.averageScore / 10 : null,
      myScore: own && own.score > 0 ? own.score : null,
      myStatus: own?.status ?? null,
      myProgress: own?.progress ?? null,
    };
  });
}
