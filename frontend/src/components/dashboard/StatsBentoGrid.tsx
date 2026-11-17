'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Tv,
  PlayCircle,
  Clock,
  Star,
  PieChart,
  Compass,
  CheckCircle2,
  Bookmark,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  UserAnimeStatistics,
  MediaListStatus,
} from '@/types/anilist';

export interface StatusCountMap {
  CURRENT: number;
  COMPLETED: number;
  PLANNING: number;
  PAUSED: number;
  DROPPED: number;
}

export interface StatsBentoGridProps {
  /** Estadísticas de anime devueltas por AniList (`Viewer.statistics.anime`) */
  statistics?: UserAnimeStatistics | null;
  /** Conteo explícito por estados de la lista del usuario */
  statusCounts?: Partial<StatusCountMap>;
}

interface StatusDistributionMeta {
  key: keyof StatusCountMap;
  label: string;
  barColor: string;
  dotColor: string;
  badgeBg: string;
  textColor: string;
  icon: LucideIcon;
}

const STATUS_META: readonly StatusDistributionMeta[] = [
  {
    key: 'CURRENT',
    label: 'Viendo',
    barColor: 'bg-sky-400',
    dotColor: 'bg-sky-400',
    badgeBg: 'bg-sky-500/10 border-sky-400/30',
    textColor: 'text-sky-300',
    icon: PlayCircle,
  },
  {
    key: 'COMPLETED',
    label: 'Completados',
    barColor: 'bg-emerald-400',
    dotColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-400/30',
    textColor: 'text-emerald-300',
    icon: CheckCircle2,
  },
  {
    key: 'PLANNING',
    label: 'Planeo Ver',
    barColor: 'bg-purple-400',
    dotColor: 'bg-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-400/30',
    textColor: 'text-purple-300',
    icon: Bookmark,
  },
  {
    key: 'PAUSED',
    label: 'En Pausa',
    barColor: 'bg-amber-400',
    dotColor: 'bg-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-400/30',
    textColor: 'text-amber-300',
    icon: PauseCircle,
  },
  {
    key: 'DROPPED',
    label: 'Abandonados',
    barColor: 'bg-rose-500',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/10 border-rose-500/30',
    textColor: 'text-rose-300',
    icon: XCircle,
  },
] as const;

const FALLBACK_STATS: UserAnimeStatistics = {
  count: 118,
  meanScore: 84.6,
  standardDeviation: 11.2,
  minutesWatched: 34080, // ~23.6 días
  episodesWatched: 1420,
  genres: [
    { genre: 'Action', count: 68, meanScore: 86, minutesWatched: 18200, episodesWatched: 760 },
    { genre: 'Fantasy', count: 52, meanScore: 85, minutesWatched: 14100, episodesWatched: 590 },
    { genre: 'Supernatural', count: 41, meanScore: 87, minutesWatched: 10800, episodesWatched: 450 },
    { genre: 'Drama', count: 36, meanScore: 88, minutesWatched: 8900, episodesWatched: 370 },
    { genre: 'Sci-Fi', count: 24, meanScore: 83, minutesWatched: 6200, episodesWatched: 260 },
  ],
};

const FALLBACK_STATUS_COUNTS: StatusCountMap = {
  CURRENT: 7,
  COMPLETED: 82,
  PLANNING: 21,
  PAUSED: 5,
  DROPPED: 3,
};

export function StatsBentoGrid({
  statistics,
  statusCounts,
}: StatsBentoGridProps): React.JSX.Element {
  const activeStats = statistics ?? FALLBACK_STATS;

  // Resolver distribución por estados desde props, desde statistics.statuses o fallback
  const resolvedCounts = useMemo<StatusCountMap>(() => {
    if (statusCounts) {
      return {
        CURRENT: statusCounts.CURRENT ?? 0,
        COMPLETED: statusCounts.COMPLETED ?? 0,
        PLANNING: statusCounts.PLANNING ?? 0,
        PAUSED: statusCounts.PAUSED ?? 0,
        DROPPED: statusCounts.DROPPED ?? 0,
      };
    }

    if (activeStats.statuses && activeStats.statuses.length > 0) {
      const map: StatusCountMap = {
        CURRENT: 0,
        COMPLETED: 0,
        PLANNING: 0,
        PAUSED: 0,
        DROPPED: 0,
      };

      for (const st of activeStats.statuses) {
        const statusKey = st.status as Exclude<MediaListStatus, 'REPEATING'>;
        if (statusKey in map) {
          map[statusKey] = st.count;
        }
      }
      return map;
    }

    return FALLBACK_STATUS_COUNTS;
  }, [statusCounts, activeStats.statuses]);

  const totalListEntries = useMemo<number>(() => {
    const sum =
      resolvedCounts.CURRENT +
      resolvedCounts.COMPLETED +
      resolvedCounts.PLANNING +
      resolvedCounts.PAUSED +
      resolvedCounts.DROPPED;
    return sum > 0 ? sum : 1;
  }, [resolvedCounts]);

  // Conversión de minutos a Días y Horas
  const timeWatchedFormatted = useMemo(() => {
    const totalMinutes = Math.max(0, activeStats.minutesWatched);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = (totalMinutes / (60 * 24)).toFixed(1);
    return { totalHours, days };
  }, [activeStats.minutesWatched]);

  const topGenres = useMemo(() => {
    const list = activeStats.genres ?? FALLBACK_STATS.genres ?? [];
    return list.slice(0, 5);
  }, [activeStats.genres]);

  const maxGenreCount = useMemo(() => {
    if (topGenres.length === 0) return 1;
    return Math.max(...topGenres.map((g) => g.count), 1);
  }, [topGenres]);

  const kpiCards = [
    {
      id: 'total-anime',
      label: 'Animes en Lista',
      value: activeStats.count.toLocaleString('es-ES'),
      sublabel: `${resolvedCounts.COMPLETED} completados`,
      icon: Tv,
      accentClass: 'text-sky-400 bg-sky-500/10 border-sky-400/25',
    },
    {
      id: 'episodes-watched',
      label: 'Episodios Vistos',
      value: activeStats.episodesWatched.toLocaleString('es-ES'),
      sublabel: `+${(activeStats.episodesWatched * 10).toLocaleString('es-ES')} PL acumulados`,
      icon: PlayCircle,
      accentClass: 'text-kurama bg-kurama/10 border-kurama/30',
    },
    {
      id: 'time-watched',
      label: 'Tiempo Invertido',
      value: `${timeWatchedFormatted.days} días`,
      sublabel: `${timeWatchedFormatted.totalHours.toLocaleString('es-ES')} horas totales`,
      icon: Clock,
      accentClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/25',
    },
    {
      id: 'mean-score',
      label: 'Nota Media',
      value: (activeStats.meanScore / 10).toFixed(1),
      sublabel: `${activeStats.meanScore.toFixed(0)} / 100 en AniList`,
      icon: Star,
      accentClass: 'text-amber-300 bg-amber-500/10 border-amber-400/25',
    },
  ] as const;

  return (
    <section aria-label="Estadísticas de Anime" className="space-y-5 w-full">
      {/* ═══════════════════════════════════════════════════════════════════
          FILA 1: 4 TARJETAS KPI BENTO
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06, ease: 'easeOut' }}
              className="bento-card p-5 flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110',
                    kpi.accentClass
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {kpi.sublabel}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 2: DISTRIBUCIÓN DE ESTADOS (7 COLS) + GÉNEROS TOP (5 COLS)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Widget de Distribución de Estados */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="bento-card lg:col-span-7 p-6 flex flex-col justify-between space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kurama/15 border border-kurama/30 text-kurama">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Distribución de tu Colección
                </h3>
                <p className="text-xs text-muted-foreground">
                  Desglose por estado en AniList
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 text-xs font-semibold text-slate-200">
              {totalListEntries} títulos
            </span>
          </div>

          {/* Barra Multicolor Segmentada */}
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-950/90 p-0.5 border border-white/[0.08] flex gap-0.5">
            {STATUS_META.map((item, idx) => {
              const count = resolvedCounts[item.key];
              const pct = Number(((count / totalListEntries) * 100).toFixed(1));
              if (pct <= 0) return null;

              return (
                <motion.div
                  key={item.key}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.25 + idx * 0.08, ease: 'easeOut' }}
                  className={cn('h-full first:rounded-l-full last:rounded-r-full', item.barColor)}
                  title={`${item.label}: ${count} (${pct}%)`}
                />
              );
            })}
          </div>

          {/* Leyenda Interactiva en Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            {STATUS_META.map((item) => {
              const count = resolvedCounts[item.key];
              const pct = Math.round((count / totalListEntries) * 100);
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  className={cn(
                    'rounded-xl border p-3 flex flex-col justify-between transition-transform hover:-translate-y-0.5',
                    item.badgeBg
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-slate-300 truncate">
                      {item.label}
                    </span>
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', item.textColor)} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-display text-lg font-extrabold text-white">
                      {count}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Widget de Top Géneros Favoritos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="bento-card lg:col-span-5 p-6 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Géneros Dominantes
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tus temáticas más vistas y su nota media
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {topGenres.map((genreItem, idx) => {
              const widthPct = Math.round((genreItem.count / maxGenreCount) * 100);
              return (
                <div key={genreItem.genre} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {genreItem.genre}
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-white">{genreItem.count}</strong> animes •{' '}
                      <span className="text-kurama font-semibold">
                        ★ {(genreItem.meanScore / 10).toFixed(1)}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950/80 border border-white/[0.05]">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.85, delay: 0.3 + idx * 0.07 }}
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-kurama"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
