// Solo servidor: contiene las respuestas. No importar desde componentes de cliente.
import { ROUND_LIMITS, SCORE_PAIRS, type RetoOption, type RoundType } from './types';

/* ------------------------------------------------------------------ */
/* Reto completo tal y como se guarda en daily_challenges.rounds        */
/* (con respuestas: SOLO servidor)                                       */
/* ------------------------------------------------------------------ */

interface BaseRound {
  type: RoundType;
  label: string;
  limit: number;
}
export interface CoverRound extends BaseRound { type: 'cover'; options: RetoOption[]; answerId: number; cover: string }
export interface HintsRound extends BaseRound { type: 'hints'; options: RetoOption[]; answerId: number; hints: string[] }
export interface CharacterRound extends BaseRound { type: 'character'; options: RetoOption[]; answerId: number; image: string; name: string }
export interface ScoreRound extends BaseRound {
  type: 'score';
  pairs: Array<{
    a: { id: number; title: string; cover: string };
    b: { id: number; title: string; cover: string };
    answer: 'a' | 'b';
    scores: [number, number];
  }>;
}
export type FullRound = CoverRound | HintsRound | CharacterRound | ScoreRound;

/* ------------------------------------------------------------------ */
/* Azar con semilla: el mismo reto para todos el mismo día               */
/* ------------------------------------------------------------------ */

export function makeRng(seedText: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* AniList                                                               */
/* ------------------------------------------------------------------ */

interface Media {
  id: number;
  title: { romaji: string | null; english: string | null };
  coverImage: { extraLarge: string | null; large: string | null };
  season: string | null;
  seasonYear: number | null;
  startDate: { year: number | null };
  episodes: number | null;
  genres: string[];
  averageScore: number | null;
  studios: { nodes: Array<{ name: string }> };
  characters: { nodes: Array<{ name: { full: string | null }; image: { large: string | null } }> };
}

const QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, format_in: [TV, MOVIE, TV_SHORT, ONA]) {
      id
      title { romaji english }
      coverImage { extraLarge large }
      season seasonYear
      startDate { year }
      episodes genres averageScore
      studios(isMain: true) { nodes { name } }
      characters(role: MAIN, sort: FAVOURITES_DESC, perPage: 2) { nodes { name { full } image { large } } }
    }
  }
}`;

async function fetchPage(page: number): Promise<Media[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { page } }),
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: { Page?: { media?: Media[] } } };
        return json.data?.Page?.media ?? [];
      }
    } catch {
      /* reintento */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Construcción del reto                                                 */
/* ------------------------------------------------------------------ */

const GENRES_ES: Record<string, string> = {
  Action: 'Acción', Adventure: 'Aventura', Comedy: 'Comedia', Drama: 'Drama', Ecchi: 'Ecchi', Fantasy: 'Fantasía',
  Horror: 'Terror', 'Mahou Shoujo': 'Mahou shoujo', Mecha: 'Mecha', Music: 'Música', Mystery: 'Misterio',
  Psychological: 'Psicológico', Romance: 'Romance', 'Sci-Fi': 'Ciencia ficción', 'Slice of Life': 'Recuentos de la vida',
  Sports: 'Deportes', Supernatural: 'Sobrenatural', Thriller: 'Thriller',
};
const SEASONS_ES: Record<string, string> = { WINTER: 'invierno', SPRING: 'primavera', SUMMER: 'verano', FALL: 'otoño' };

const titleOf = (m: Media): string => m.title.english || m.title.romaji || `Anime #${m.id}`;
const optionOf = (m: Media): RetoOption => {
  const title = titleOf(m);
  const alt = m.title.romaji && m.title.romaji !== title ? m.title.romaji : null;
  return { id: m.id, title, alt };
};
const coverOf = (m: Media): string | null => m.coverImage.extraLarge || m.coverImage.large;

/** 3 señuelos, preferiblemente del mismo género, con títulos distintos. */
function decoys(answer: Media, pool: Media[], rnd: () => number): Media[] {
  const others = pool.filter((m) => m.id !== answer.id && titleOf(m) !== titleOf(answer));
  const sameGenre = shuffle(others.filter((m) => m.genres.some((g) => answer.genres.includes(g))), rnd);
  const rest = shuffle(others, rnd);
  const out: Media[] = [];
  for (const m of [...sameGenre, ...rest]) {
    if (out.length === 3) break;
    if (!out.some((o) => o.id === m.id || titleOf(o) === titleOf(m))) out.push(m);
  }
  return out;
}

function optionsFor(answer: Media, pool: Media[], rnd: () => number): RetoOption[] {
  return shuffle([answer, ...decoys(answer, pool, rnd)], rnd).map(optionOf);
}

/** Evita personajes que se llaman como su serie (p. ej. «Naruto Uzumaki» → Naruto). */
function characterGivesAway(name: string, m: Media): boolean {
  const t = `${m.title.english ?? ''} ${m.title.romaji ?? ''}`.toLowerCase();
  return name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.includes(w));
}

export async function buildChallenge(day: string): Promise<FullRound[]> {
  const rnd = makeRng(`reto-${day}`);
  const popularPage = 1 + Math.floor(rnd() * 3); // top 150
  const hardPage = 4 + Math.floor(rnd() * 6); // puestos 151–450
  const [popularRaw, hardRaw] = await Promise.all([fetchPage(popularPage), fetchPage(hardPage)]);

  const usable = (m: Media): boolean => Boolean(coverOf(m)) && m.genres.length > 0;
  const popular = shuffle(popularRaw.filter(usable), rnd);
  const hard = shuffle(hardRaw.filter(usable), rnd);
  const pool = [...popular, ...hard];
  if (popular.length < 20 || hard.length < 10) throw new Error('AniList no devolvió suficientes animes');

  const used = new Set<number>();
  const take = (list: Media[], ok: (m: Media) => boolean = () => true): Media => {
    const m = list.find((x) => !used.has(x.id) && ok(x));
    if (!m) throw new Error('Sin candidatos para el reto');
    used.add(m.id);
    return m;
  };

  // 1 · Portada borrosa (popular)
  const c1 = take(popular);
  // 2 · Pistas
  const h = take(popular, (m) => m.studios.nodes.length > 0 && Boolean(m.seasonYear || m.startDate.year));
  // 3 · Personaje
  const ch = take(popular, (m) => {
    const c = m.characters.nodes[0];
    return Boolean(c?.image.large && c.name.full && !characterGivesAway(c.name.full, m));
  });
  // 4 · ¿Cuál tiene más nota? (parejas con notas distintas)
  const scored = pool.filter((m) => !used.has(m.id) && typeof m.averageScore === 'number');
  const pairs: ScoreRound['pairs'] = [];
  for (let i = 0; i + 1 < scored.length && pairs.length < SCORE_PAIRS; i += 2) {
    const a = scored[i]!;
    const b = scored[i + 1]!;
    if (a.averageScore === b.averageScore) continue;
    used.add(a.id);
    used.add(b.id);
    pairs.push({
      a: { id: a.id, title: titleOf(a), cover: coverOf(a)! },
      b: { id: b.id, title: titleOf(b), cover: coverOf(b)! },
      answer: (a.averageScore ?? 0) > (b.averageScore ?? 0) ? 'a' : 'b',
      scores: [a.averageScore ?? 0, b.averageScore ?? 0],
    });
  }
  // 5 · Portada borrosa difícil
  const c5 = take(hard);

  const year = h.seasonYear || h.startDate.year;
  const char = h.characters.nodes[0]?.name.full;
  const hints = [
    `Género: ${h.genres.slice(0, 3).map((g) => GENRES_ES[g] ?? g).join(', ')}`,
    h.season && year ? `Se estrenó en ${SEASONS_ES[h.season] ?? h.season} de ${year}` : `Se estrenó en ${year}`,
    `Estudio: ${h.studios.nodes[0]!.name}${h.episodes ? ` · ${h.episodes} episodios` : ''}`,
    char && !characterGivesAway(char, h) ? `Personaje principal: ${char}` : `Nota media en AniList: ${h.averageScore ?? '?'}/100`,
  ];

  const mainChar = ch.characters.nodes[0]!;

  return [
    { type: 'cover', label: 'Portada borrosa', limit: ROUND_LIMITS.cover, options: optionsFor(c1, popular, rnd), answerId: c1.id, cover: coverOf(c1)! },
    { type: 'hints', label: 'Pistas', limit: ROUND_LIMITS.hints, options: optionsFor(h, popular, rnd), answerId: h.id, hints },
    { type: 'character', label: '¿De qué anime es?', limit: ROUND_LIMITS.character, options: optionsFor(ch, popular, rnd), answerId: ch.id, image: mainChar.image.large!, name: mainChar.name.full! },
    { type: 'score', label: '¿Cuál tiene más nota?', limit: ROUND_LIMITS.score, pairs },
    { type: 'cover', label: 'Portada borrosa · difícil', limit: ROUND_LIMITS.cover, options: optionsFor(c5, hard, rnd), answerId: c5.id, cover: coverOf(c5)! },
  ];
}
