// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE PROGRESIÓN, NIVELES, MARCOS Y LIGAS (KuramaTracker) — CERO `any`
// ═══════════════════════════════════════════════════════════════════════════

export type FrameType =
  | 'none'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'ruby'
  | 'diamond'
  | 'chroma';

export type LeagueTierId = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface LevelBracket {
  maxLevel: number;
  baseEpisodes: number;
  incrementPerLevel: number;
}

export interface ProgressionCurveConfig {
  pointsPerEpisode: number;
  brackets: readonly LevelBracket[];
  exponentialStartLevel: number;
  exponentialBaseEpisodes: number;
  exponentialGrowthRate: number;
}

/**
 * Configuración centralizada de la curva de dificultad.
 * Modifica estos valores para ajustar la velocidad de subida de nivel o el peso de los episodios en PL.
 */
export const PROGRESSION_CONFIG: ProgressionCurveConfig = {
  pointsPerEpisode: 10,
  brackets: [
    { maxLevel: 10, baseEpisodes: 12, incrementPerLevel: 2 },
    { maxLevel: 20, baseEpisodes: 32, incrementPerLevel: 3 },
    { maxLevel: 30, baseEpisodes: 62, incrementPerLevel: 5 },
    { maxLevel: 40, baseEpisodes: 112, incrementPerLevel: 8 },
    { maxLevel: 50, baseEpisodes: 192, incrementPerLevel: 12 },
    { maxLevel: 60, baseEpisodes: 312, incrementPerLevel: 15 },
  ],
  exponentialStartLevel: 61,
  exponentialBaseEpisodes: 200,
  exponentialGrowthRate: 1.08,
} as const;

export interface TrophyMilestone {
  level: number;
  title: string;
  description: string;
  frameName: Exclude<FrameType, 'none'> | null;
  frameLabel: string;
  accentHex: string;
}

/**
 * Hitos de nivel, títulos honoríficos y marcos de avatar desbloqueables.
 */
export const TROPHY_CONFIG: readonly TrophyMilestone[] = [
  {
    level: 10,
    title: 'Novato de Bronce',
    description: 'Alcanza el Nivel 10 completando tus primeras series.',
    frameName: 'bronze',
    frameLabel: 'Marco de Bronce',
    accentHex: '#cd7f32',
  },
  {
    level: 20,
    title: 'Aprendiz',
    description: 'Alcanza el Nivel 20 demostrando constancia semanal.',
    frameName: null,
    frameLabel: 'Sin Marco',
    accentHex: '#94a3b8',
  },
  {
    level: 30,
    title: 'Maestro de Plata',
    description: 'Alcanza el Nivel 30 con un sólido historial de anime.',
    frameName: 'silver',
    frameLabel: 'Marco de Plata',
    accentHex: '#e2e8f0',
  },
  {
    level: 40,
    title: 'Veterano',
    description: 'Alcanza el Nivel 40 dominando múltiples temporadas.',
    frameName: null,
    frameLabel: 'Sin Marco',
    accentHex: '#38bdf8',
  },
  {
    level: 50,
    title: 'Leyenda del Anime',
    description: 'Alcanza el Nivel 50 y desbloquea el prestigioso Marco de Oro.',
    frameName: 'gold',
    frameLabel: 'Marco de Oro',
    accentHex: '#fbbf24',
  },
  {
    level: 60,
    title: 'Mito',
    description: 'Alcanza el Nivel 60 entrando en la élite carmesí.',
    frameName: 'ruby',
    frameLabel: 'Marco de Rubí',
    accentHex: '#f43f5e',
  },
  {
    level: 70,
    title: 'Semi-Dios',
    description: 'Alcanza el Nivel 70 superando la barrera exponencial.',
    frameName: null,
    frameLabel: 'Sin Marco',
    accentHex: '#a855f7',
  },
  {
    level: 80,
    title: 'Dios del Anime',
    description: 'Alcanza el Nivel 80 y porta el Marco de Diamante.',
    frameName: 'diamond',
    frameLabel: 'Marco de Diamante',
    accentHex: '#22d3ee',
  },
  {
    level: 90,
    title: 'Titán',
    description: 'Alcanza el Nivel 90 con una colección colosal.',
    frameName: null,
    frameLabel: 'Sin Marco',
    accentHex: '#ec4899',
  },
  {
    level: 100,
    title: 'Completista Supremo',
    description: 'Alcanza el Nivel 100 y obtén el mítico Marco Croma.',
    frameName: 'chroma',
    frameLabel: 'Marco Croma',
    accentHex: '#f59e0b',
  },
] as const;

export interface FrameVisualStyle {
  id: FrameType;
  label: string;
  ringClass: string;
  glowClass: string;
  badgeClass: string;
}

/**
 * Clases de Tailwind CSS para representar visualmente cada marco de avatar en el Dashboard y Rankings.
 */
export const FRAME_STYLES: Record<FrameType, FrameVisualStyle> = {
  none: {
    id: 'none',
    label: 'Estándar',
    ringClass: 'ring-2 ring-white/15',
    glowClass: '',
    badgeClass: 'bg-secondary text-muted-foreground border-white/10',
  },
  bronze: {
    id: 'bronze',
    label: 'Marco de Bronce',
    ringClass: 'ring-[3px] ring-amber-700 border-2 border-amber-500/60',
    glowClass: 'shadow-[0_0_20px_rgba(180,83,9,0.45)]',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
  },
  silver: {
    id: 'silver',
    label: 'Marco de Plata',
    ringClass: 'ring-[3px] ring-slate-200 border-2 border-white',
    glowClass: 'shadow-[0_0_22px_rgba(226,232,240,0.45)]',
    badgeClass: 'bg-slate-800/90 text-slate-100 border-slate-300/50',
  },
  gold: {
    id: 'gold',
    label: 'Marco de Oro',
    ringClass: 'ring-[3px] ring-amber-400 border-2 border-yellow-200',
    glowClass: 'shadow-[0_0_28px_rgba(251,191,36,0.6)]',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/60',
  },
  ruby: {
    id: 'ruby',
    label: 'Marco de Rubí',
    ringClass: 'ring-[3px] ring-rose-500 border-2 border-rose-300',
    glowClass: 'shadow-[0_0_28px_rgba(244,63,94,0.65)]',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/60',
  },
  diamond: {
    id: 'diamond',
    label: 'Marco de Diamante',
    ringClass: 'ring-[3px] ring-cyan-400 border-2 border-sky-200',
    glowClass: 'shadow-[0_0_32px_rgba(34,211,238,0.7)]',
    badgeClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60',
  },
  chroma: {
    id: 'chroma',
    label: 'Marco Croma',
    ringClass:
      'ring-[3px] ring-fuchsia-500 border-2 border-amber-300 animate-pulse',
    glowClass:
      'shadow-[0_0_36px_rgba(245,158,11,0.75),0_0_60px_rgba(168,85,247,0.5)]',
    badgeClass:
      'bg-gradient-to-r from-amber-500/30 via-fuchsia-500/30 to-cyan-500/30 text-white border-amber-400/60',
  },
};

export interface LevelProgressResult {
  isPrivate: boolean;
  computedLevel: number;
  userTitle: string;
  currentLevelEpisodes: number;
  episodesForNextLevel: number;
  episodesRemainingToNextLevel: number;
  progressPercentage: number;
  unlockedFrame: FrameType;
  nextMilestone: TrophyMilestone | null;
}

/**
 * Calcula los episodios requeridos para completar un nivel específico.
 */
export function getEpsForNextLevel(
  level: number,
  config: ProgressionCurveConfig = PROGRESSION_CONFIG
): number {
  const safeLevel = Math.max(1, Math.floor(level));

  let previousMax = 0;
  for (const bracket of config.brackets) {
    if (safeLevel <= bracket.maxLevel) {
      const levelOffset = safeLevel - (previousMax + 1);
      return bracket.baseEpisodes + levelOffset * bracket.incrementPerLevel;
    }
    previousMax = bracket.maxLevel;
  }

  const expOffset = safeLevel - config.exponentialStartLevel;
  return Math.floor(
    config.exponentialBaseEpisodes *
      Math.pow(config.exponentialGrowthRate, Math.max(0, expOffset))
  );
}

/**
 * Determina el marco más alto desbloqueado para un nivel dado.
 */
export function getHighestUnlockedFrame(level: number): FrameType {
  if (level >= 100) return 'chroma';
  if (level >= 80) return 'diamond';
  if (level >= 60) return 'ruby';
  if (level >= 50) return 'gold';
  if (level >= 30) return 'silver';
  if (level >= 10) return 'bronze';
  return 'none';
}

/**
 * Obtiene el título de rango correspondiente al nivel actual.
 */
export function getTitleForLevel(level: number): string {
  const matchedMilestone = [...TROPHY_CONFIG]
    .reverse()
    .find((m) => level >= m.level);

  if (matchedMilestone) {
    return matchedMilestone.title;
  }

  if (level >= 61) return 'Leyenda';
  if (level >= 31) return 'Veterano';
  if (level >= 11) return 'Aprendiz';
  return 'Novato';
}

/**
 * Calcula el nivel exacto, porcentaje de barra de experiencia, episodios restantes y siguiente hito
 * a partir del total de episodios vistos por el usuario.
 */
export function calculateLevel(
  totalEpisodes: number | null | undefined,
  config: ProgressionCurveConfig = PROGRESSION_CONFIG
): LevelProgressResult {
  if (totalEpisodes === null || totalEpisodes === undefined || totalEpisodes < 0) {
    return {
      isPrivate: true,
      computedLevel: 1,
      userTitle: 'Sin clasificar',
      currentLevelEpisodes: 0,
      episodesForNextLevel: getEpsForNextLevel(1, config),
      episodesRemainingToNextLevel: getEpsForNextLevel(1, config),
      progressPercentage: 0,
      unlockedFrame: 'none',
      nextMilestone: TROPHY_CONFIG[0] ?? null,
    };
  }

  let computedLevel = 1;
  let remainingPool = Math.floor(totalEpisodes);
  let episodesForNextLevel = getEpsForNextLevel(computedLevel, config);

  while (remainingPool >= episodesForNextLevel) {
    remainingPool -= episodesForNextLevel;
    computedLevel += 1;
    episodesForNextLevel = getEpsForNextLevel(computedLevel, config);
  }

  const rawPercentage = (remainingPool / episodesForNextLevel) * 100;
  const progressPercentage = Math.min(100, Math.max(0, Number(rawPercentage.toFixed(1))));
  const episodesRemainingToNextLevel = Math.max(0, episodesForNextLevel - remainingPool);

  const nextMilestone =
    TROPHY_CONFIG.find((milestone) => milestone.level > computedLevel) ?? null;

  return {
    isPrivate: false,
    computedLevel,
    userTitle: getTitleForLevel(computedLevel),
    currentLevelEpisodes: remainingPool,
    episodesForNextLevel,
    episodesRemainingToNextLevel,
    progressPercentage,
    unlockedFrame: getHighestUnlockedFrame(computedLevel),
    nextMilestone,
  };
}

export interface UnifiedLevelSourceInput {
  /** Episodios reportados en directo por AniList (`statistics.anime.episodesWatched`) */
  anilistEpisodesWatched?: number | null;
  /** Puntos de anime en Supabase (`public.users.anime_points`, donde 1 ep = 10 pts) */
  supabaseAnimePoints?: number | null;
  /** Nivel guardado en Supabase (`public.users.level`) como último recurso si no hay puntos */
  supabaseStoredLevel?: number | null;
}

export interface UnifiedLevelSnapshot extends LevelProgressResult {
  totalEpisodesWatched: number;
  totalAnimePoints: number;
}

/**
 * ÚNICA FUENTE DE VERDAD para el nivel y experiencia del usuario en toda la aplicación.
 * Toma el valor más actualizado entre AniList (`episodesWatched`) y Supabase (`anime_points / 10`),
 * garantizando que el Dashboard, la Barra Lateral, el Grupo y la Arena muestren exactamente el mismo Nivel.
 */
export function resolveUnifiedUserLevel(
  input: UnifiedLevelSourceInput
): UnifiedLevelSnapshot {
  const fromAniList =
    typeof input.anilistEpisodesWatched === 'number' &&
    input.anilistEpisodesWatched > 0
      ? Math.floor(input.anilistEpisodesWatched)
      : 0;

  const fromSupabasePoints =
    typeof input.supabaseAnimePoints === 'number' && input.supabaseAnimePoints > 0
      ? Math.floor(input.supabaseAnimePoints / PROGRESSION_CONFIG.pointsPerEpisode)
      : 0;

  const totalEpisodesWatched = Math.max(fromAniList, fromSupabasePoints);
  const totalAnimePoints =
    totalEpisodesWatched * PROGRESSION_CONFIG.pointsPerEpisode;

  const levelResult = calculateLevel(totalEpisodesWatched);

  return {
    ...levelResult,
    totalEpisodesWatched,
    totalAnimePoints,
  };
}

// ─── SISTEMA DE PUNTOS DE LIGA (PL) Y DIVISIONES ─────────────────────────────

export interface LeagueTierInfo {
  id: LeagueTierId;
  name: 'Bronce' | 'Plata' | 'Oro' | 'Diamante';
  icon: string;
  minPL: number;
  nextThresholdPL: number | null;
  badgeGradient: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
}

export const LEAGUE_TIERS: readonly LeagueTierInfo[] = [
  {
    id: 'bronze',
    name: 'Bronce',
    icon: '🥉',
    minPL: 0,
    nextThresholdPL: 10000,
    badgeGradient: 'from-amber-800/80 via-amber-700/60 to-orange-900/80',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-600/50',
    glowColor: 'shadow-[0_0_20px_rgba(217,119,6,0.25)]',
  },
  {
    id: 'silver',
    name: 'Plata',
    icon: '🥈',
    minPL: 10000,
    nextThresholdPL: 30000,
    badgeGradient: 'from-slate-600/80 via-slate-400/50 to-slate-700/80',
    textColor: 'text-slate-100',
    borderColor: 'border-slate-300/50',
    glowColor: 'shadow-[0_0_20px_rgba(226,232,240,0.25)]',
  },
  {
    id: 'gold',
    name: 'Oro',
    icon: '🏆',
    minPL: 30000,
    nextThresholdPL: 60000,
    badgeGradient: 'from-amber-500/80 via-yellow-400/60 to-orange-500/80',
    textColor: 'text-amber-200',
    borderColor: 'border-amber-400/70',
    glowColor: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
  },
  {
    id: 'diamond',
    name: 'Diamante',
    icon: '💎',
    minPL: 60000,
    nextThresholdPL: null,
    badgeGradient: 'from-cyan-500/80 via-sky-400/60 to-blue-600/80',
    textColor: 'text-cyan-100',
    borderColor: 'border-cyan-300/70',
    glowColor: 'shadow-[0_0_28px_rgba(34,211,238,0.45)]',
  },
] as const;

/**
 * Calcula los Puntos de Liga Globales combinando el progreso de episodios en AniList + Puntos de Quiz.
 */
export function calculatePL(
  episodesWatched: number = 0,
  quizPoints: number = 0,
  config: ProgressionCurveConfig = PROGRESSION_CONFIG
): number {
  const safeEpisodes = Math.max(0, Math.floor(episodesWatched));
  const safeQuiz = Math.max(0, Math.floor(quizPoints));
  return safeEpisodes * config.pointsPerEpisode + safeQuiz;
}

/**
 * Devuelve la información completa y estilos de la división de Liga según los Puntos de Liga (PL).
 */
export function getLeagueInfo(pl: number): LeagueTierInfo {
  const safePL = Math.max(0, pl);
  if (safePL >= 60000) return LEAGUE_TIERS[3]!;
  if (safePL >= 30000) return LEAGUE_TIERS[2]!;
  if (safePL >= 10000) return LEAGUE_TIERS[1]!;
  return LEAGUE_TIERS[0]!;
}

/**
 * Devuelve el umbral de PL necesario para ascender a la siguiente división (o `null` si ya está en Diamante).
 */
export function getNextLeagueThreshold(pl: number): number | null {
  return getLeagueInfo(pl).nextThresholdPL;
}
