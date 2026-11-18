// ═══════════════════════════════════════════════════════════════════════════
// TIPOS ESTRICTOS DE ANILIST GRAPHQL API v2 (Cero `any`)
// ═══════════════════════════════════════════════════════════════════════════

export type MediaType = 'ANIME' | 'MANGA';

export type MediaFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | 'MANGA'
  | 'NOVEL'
  | 'ONE_SHOT';

export type MediaStatus =
  | 'FINISHED'
  | 'RELEASING'
  | 'NOT_YET_RELEASED'
  | 'CANCELLED'
  | 'HIATUS';

export type MediaSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

export type MediaListStatus =
  | 'CURRENT'
  | 'PLANNING'
  | 'COMPLETED'
  | 'DROPPED'
  | 'PAUSED'
  | 'REPEATING';

export type MediaSort =
  | 'ID'
  | 'ID_DESC'
  | 'TITLE_ROMAJI'
  | 'TITLE_ENGLISH'
  | 'POPULARITY'
  | 'POPULARITY_DESC'
  | 'SCORE'
  | 'SCORE_DESC'
  | 'TRENDING'
  | 'TRENDING_DESC'
  | 'UPDATED_AT_DESC'
  | 'START_DATE_DESC';

export interface FuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
  userPreferred: string;
}

export interface MediaCoverImage {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
}

export interface NextAiringEpisode {
  id: number;
  airingAt: number; // Unix timestamp en segundos
  timeUntilAiring: number; // Segundos restantes
  episode: number;
}

export interface MediaExternalLink {
  id: number;
  url: string;
  site: string;
  siteId: number | null;
  type: 'INFO' | 'STREAMING' | 'SOCIAL' | null;
  language: string | null;
  color: string | null;
  icon: string | null;
  isDisabled: boolean;
}

export interface StudioNode {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

export interface StudioConnection {
  nodes: StudioNode[];
}

export interface MediaTag {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  rank: number | null;
  isGeneralSpoiler: boolean;
  isMediaSpoiler: boolean;
}

export interface Media {
  id: number;
  idMal: number | null;
  type?: MediaType;
  title: MediaTitle;
  format: MediaFormat | null;
  status: MediaStatus | null;
  description: string | null;
  startDate: FuzzyDate | null;
  endDate: FuzzyDate | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null; // Duración por episodio en minutos
  chapters?: number | null;
  volumes?: number | null;
  coverImage: MediaCoverImage;
  bannerImage: string | null;
  genres: string[];
  synonyms: string[];
  averageScore: number | null; // 0 - 100
  meanScore: number | null; // 0 - 100
  popularity: number | null;
  favourites: number | null;
  isAdult: boolean;
  nextAiringEpisode: NextAiringEpisode | null;
  externalLinks?: MediaExternalLink[];
  studios?: StudioConnection;
  tags?: MediaTag[];
  siteUrl: string | null;
}

// ─── ENTRADAS DE LISTA DEL USUARIO (MediaList) ───────────────────────────────

export interface MediaListEntry {
  id: number;
  userId?: number;
  mediaId: number;
  status: MediaListStatus;
  score: number; // Según el formato de puntuación del usuario (0-10 ó 0-100)
  progress: number; // Episodios vistos
  repeat: number; // Número de rewatches
  priority: number;
  private: boolean;
  notes: string | null;
  startedAt: FuzzyDate | null;
  completedAt: FuzzyDate | null;
  updatedAt: number | null; // Unix timestamp
  createdAt: number | null; // Unix timestamp
  media: Media;
}

export interface MediaListGroup {
  name: string;
  isCustomList: boolean;
  isSplitCompletedList: boolean;
  status: MediaListStatus | null;
  entries: MediaListEntry[];
}

export interface MediaListCollection {
  lists: MediaListGroup[];
  hasNextChunk: boolean;
  user?: Pick<AniListUser, 'id' | 'name' | 'avatar'>;
}

// ─── ESTADÍSTICAS Y PERFIL DE USUARIO EN ANILIST ─────────────────────────────

export interface UserFormatStatistic {
  count: number;
  meanScore: number;
  minutesWatched: number;
  /** AniList no expone este campo en las estadísticas agrupadas */
  episodesWatched?: number;
  format: MediaFormat;
}

export interface UserStatusStatistic {
  count: number;
  meanScore: number;
  minutesWatched: number;
  /** AniList no expone este campo en las estadísticas agrupadas */
  episodesWatched?: number;
  status: MediaListStatus;
}

export interface UserGenreStatistic {
  count: number;
  meanScore: number;
  minutesWatched: number;
  /** AniList no expone este campo en las estadísticas agrupadas */
  episodesWatched?: number;
  genre: string;
}

export interface UserReleaseYearStatistic {
  count: number;
  meanScore: number;
  minutesWatched: number;
  /** AniList no expone este campo en las estadísticas agrupadas */
  episodesWatched?: number;
  releaseYear: number;
}

export interface UserAnimeStatistics {
  count: number;
  meanScore: number;
  standardDeviation: number;
  minutesWatched: number;
  episodesWatched: number;
  formats?: UserFormatStatistic[];
  statuses?: UserStatusStatistic[];
  genres?: UserGenreStatistic[];
  releaseYears?: UserReleaseYearStatistic[];
}

export interface UserStatistics {
  anime: UserAnimeStatistics;
}

export interface AniListAvatar {
  large: string | null;
  medium: string | null;
}

export interface AniListUser {
  id: number;
  name: string;
  about: string | null;
  avatar: AniListAvatar;
  bannerImage: string | null;
  isFollowing?: boolean;
  isFollower?: boolean;
  siteUrl: string;
  updatedAt: number | null;
  statistics: UserStatistics;
}

// ─── CALENDARIO DE EMISIÓN Y ACTIVIDAD SOCIAL ────────────────────────────────

export interface AiringScheduleNode {
  id: number;
  airingAt: number; // Unix timestamp
  timeUntilAiring: number;
  episode: number;
  mediaId: number;
  media: Media;
}

export interface ListActivity {
  id: number;
  userId: number;
  type: 'ANIME_LIST' | 'MANGA_LIST';
  status: string; // ej. "watched episode", "completed", "plans to watch"
  progress: string | null; // ej. "1 - 12" o "5"
  createdAt: number;
  user: Pick<AniListUser, 'id' | 'name' | 'avatar'>;
  media: Pick<Media, 'id' | 'title' | 'coverImage' | 'type' | 'status' | 'episodes'>;
}

// ─── RESPUESTAS PAGINADAS Y WRAPPERS GRAPHQL ─────────────────────────────────

export interface PageInfo {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export interface AniListPage<T> {
  pageInfo: PageInfo;
  media?: T[];
  airingSchedules?: T[];
  followers?: T[];
  following?: T[];
  activities?: T[];
}

export interface GraphQLErrorItem {
  message: string;
  status?: number;
  locations?: Array<{ line: number; column: number }>;
}

export interface GraphQLResponse<TData> {
  data: TData | null;
  errors?: GraphQLErrorItem[];
}

// ─── PARÁMETROS DE FILTRADO Y MUTACIÓN ───────────────────────────────────────

export interface AnimeSearchFilters {
  query?: string;
  page?: number;
  perPage?: number;
  format?: MediaFormat | 'ALL';
  status?: MediaStatus | 'ALL';
  genre?: string | 'ALL';
  season?: MediaSeason;
  seasonYear?: number;
  sort?: MediaSort[];
}

export interface SaveMediaListEntryVariables {
  id?: number;
  mediaId: number;
  status?: MediaListStatus;
  scoreRaw?: number; // 0 - 100
  progress?: number;
  repeat?: number;
  private?: boolean;
  notes?: string;
}
