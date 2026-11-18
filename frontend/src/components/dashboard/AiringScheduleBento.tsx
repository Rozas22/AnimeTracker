'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Radio,
  Sparkles,
  ExternalLink,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiringScheduleNode, MediaListEntry } from '@/types/anilist';

export interface AiringScheduleBentoProps {
  /** Lista de horarios de emisión reales y validados desde AniList */
  schedules?: AiringScheduleNode[];
  /** Entradas de la lista del usuario en estado CURRENT */
  watchingEntries?: MediaListEntry[];
}

interface DayTab {
  dayIndex: number; // 0 = Domingo, 1 = Lunes ... 6 = Sábado
  shortName: string;
  fullName: string;
}

const WEEK_DAYS: readonly DayTab[] = [
  { dayIndex: 1, shortName: 'Lun', fullName: 'Lunes' },
  { dayIndex: 2, shortName: 'Mar', fullName: 'Martes' },
  { dayIndex: 3, shortName: 'Mié', fullName: 'Miércoles' },
  { dayIndex: 4, shortName: 'Jue', fullName: 'Jueves' },
  { dayIndex: 5, shortName: 'Vie', fullName: 'Viernes' },
  { dayIndex: 6, shortName: 'Sáb', fullName: 'Sábado' },
  { dayIndex: 0, shortName: 'Dom', fullName: 'Domingo' },
] as const;

export interface NormalizedAiringItem {
  id: string;
  mediaId: number;
  title: string;
  coverUrl: string;
  episode: number;
  airingAt: number; // Unix timestamp en segundos
  dayOfWeek: number; // 0-6
  averageScore: number | null;
  siteUrl: string | null;
  isUserWatching: boolean;
}

function formatTimeRemaining(airingAtSec: number): string {
  const diffSec = airingAtSec - Math.floor(Date.now() / 1000);
  if (diffSec <= 0) return 'Emitido hoy';

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);

  if (days > 0) return `En ${days}d ${hours}h`;
  if (hours > 0) return `En ${hours}h ${mins}m`;
  return `En ${Math.max(1, mins)} min`;
}

export function AiringScheduleBento({
  schedules = [],
  watchingEntries = [],
}: AiringScheduleBentoProps): React.JSX.Element {
  const todayDayIndex = useMemo<number>(() => new Date().getDay(), []);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayIndex);
  const [onlyMyWatching, setOnlyMyWatching] = useState<boolean>(false);

  // Conjunto de mediaIds que el usuario está viendo actualmente
  const watchingMediaIds = useMemo<Set<number>>(() => {
    return new Set(
      watchingEntries
        .filter((e) => e.status === 'CURRENT' || e.status === 'PLANNING')
        .map((e) => e.mediaId)
    );
  }, [watchingEntries]);

  // Normalizar y validar estrictamente: SOLO animes con status === 'RELEASING' y póster real de AniList
  const normalizedItems = useMemo<NormalizedAiringItem[]>(() => {
    const itemsMap = new Map<string, NormalizedAiringItem>();

    // 1. Añadir desde entradas que el usuario está viendo (si siguen en emisión y tienen próximo episodio)
    for (const entry of watchingEntries) {
      const media = entry.media;
      const nextEp = media.nextAiringEpisode;
      if (!nextEp) continue;
      if (media.status !== 'RELEASING') continue; // Excluir FINISHED estrictamente

      const posterUrl =
        media.coverImage?.extraLarge ||
        media.coverImage?.large ||
        media.coverImage?.medium;
      if (!posterUrl) continue;

      const airingDate = new Date(nextEp.airingAt * 1000);
      const key = `${media.id}-${nextEp.episode}`;

      itemsMap.set(key, {
        id: `watch-${key}`,
        mediaId: media.id,
        title:
          media.title.userPreferred ||
          media.title.romaji ||
          media.title.english ||
          'Anime',
        coverUrl: posterUrl,
        episode: nextEp.episode,
        airingAt: nextEp.airingAt,
        dayOfWeek: airingDate.getDay(),
        averageScore: media.averageScore,
        siteUrl: media.siteUrl ?? `https://anilist.co/anime/${media.id}`,
        isUserWatching: true,
      });
    }

    // 2. Añadir desde el calendario semanal validado de AniList
    for (const node of schedules) {
      const media = node.media;
      if (!media) continue;
      if (media.status !== 'RELEASING') continue; // Nunca mostrar animes FINISHED

      const posterUrl =
        media.coverImage?.extraLarge ||
        media.coverImage?.large ||
        media.coverImage?.medium;
      if (!posterUrl) continue;

      const airingDate = new Date(node.airingAt * 1000);
      const key = `${media.id}-${node.episode}`;

      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          id: `sched-${node.id}-${key}`,
          mediaId: media.id,
          title:
            media.title.userPreferred ||
            media.title.romaji ||
            media.title.english ||
            'Anime',
          coverUrl: posterUrl,
          episode: node.episode,
          airingAt: node.airingAt,
          dayOfWeek: airingDate.getDay(),
          averageScore: media.averageScore,
          siteUrl: media.siteUrl ?? `https://anilist.co/anime/${media.id}`,
          isUserWatching: watchingMediaIds.has(media.id),
        });
      }
    }

    return Array.from(itemsMap.values());
  }, [schedules, watchingEntries, watchingMediaIds]);

  const filteredByDay = useMemo<NormalizedAiringItem[]>(() => {
    return normalizedItems
      .filter((item) => {
        if (item.dayOfWeek !== selectedDay) return false;
        if (onlyMyWatching && !item.isUserWatching) return false;
        return true;
      })
      .sort((a, b) => {
        // Priorizar los que el usuario sigue y luego por hora de emisión
        if (a.isUserWatching !== b.isUserWatching) {
          return a.isUserWatching ? -1 : 1;
        }
        return a.airingAt - b.airingAt;
      });
  }, [normalizedItems, selectedDay, onlyMyWatching]);

  return (
    <section
      aria-label="Calendario de Emisión Semanal"
      className="bento-card p-6 sm:p-7 space-y-6"
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              Calendario de Emisión Oficial
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <Radio className="h-3 w-3 animate-pulse" />
                Solo En Emisión (RELEASING)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sincronizado en tiempo real con AniList AiringSchedule (excluyendo series finalizadas).
            </p>
          </div>
        </div>

        {watchingMediaIds.size > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-background/70 border border-white/[0.08] p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setOnlyMyWatching(false)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                !onlyMyWatching
                  ? 'bg-kurama text-slate-950 shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              Todos ({normalizedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyMyWatching(true)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                onlyMyWatching
                  ? 'bg-kurama text-slate-950 shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              En Mi Lista
            </button>
          </div>
        )}
      </div>

      {/* Selector de Días de la Semana */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 rounded-2xl bg-background/70 p-1.5 border border-white/[0.07]">
        {WEEK_DAYS.map((day) => {
          const isSelected = selectedDay === day.dayIndex;
          const isToday = todayDayIndex === day.dayIndex;
          const countForDay = normalizedItems.filter(
            (i) =>
              i.dayOfWeek === day.dayIndex &&
              (!onlyMyWatching || i.isUserWatching)
          ).length;

          return (
            <button
              key={day.dayIndex}
              type="button"
              onClick={() => setSelectedDay(day.dayIndex)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl py-2.5 px-1 transition-colors',
                isSelected
                  ? 'text-slate-950 font-bold'
                  : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="airing-day-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-kurama-400 to-kurama-600 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <span className="relative z-10 text-xs sm:text-sm font-display">
                {day.shortName}
              </span>

              <div className="relative z-10 mt-1 flex items-center gap-1">
                {isToday && (
                  <span
                    className={cn(
                      'text-[9px] font-extrabold uppercase tracking-tighter px-1 rounded',
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-kurama/20 text-kurama'
                    )}
                  >
                    HOY
                  </span>
                )}
                {countForDay > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1 rounded-full',
                      isSelected
                        ? 'text-slate-950'
                        : 'text-emerald-400'
                    )}
                  >
                    {countForDay}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lista de Episodios del Día Seleccionado con Póster Oficial */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedDay}-${onlyMyWatching ? 'mine' : 'all'}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
        >
          {filteredByDay.length > 0 ? (
            filteredByDay.slice(0, 12).map((item) => {
              const airingDateObj = new Date(item.airingAt * 1000);
              const airingTimeStr = airingDateObj.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const airingDateShort = airingDateObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={item.id}
                  className={cn(
                    'group flex items-center gap-4 rounded-2xl border p-3.5 transition-all hover:border-kurama/40 hover:bg-white/[0.03]',
                    item.isUserWatching
                      ? 'border-kurama/35 bg-kurama/[0.05]'
                      : 'border-white/[0.07] bg-background/60'
                  )}
                >
                  {/* Póster Oficial del Anime desde AniList (coverImage.large / medium) */}
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-md">
                    <Image
                      src={item.coverUrl}
                      alt={item.title}
                      fill
                      sizes="56px"
                      unoptimized={item.coverUrl.startsWith('http')}
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Información del Episodio */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-300">
                        Ep. {item.episode}
                      </span>
                      {item.isUserWatching && (
                        <span className="rounded-md bg-kurama/20 border border-kurama/40 px-1.5 py-0.5 text-[10px] font-bold text-kurama">
                          Siguiendo
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-kurama">
                        <Clock className="h-3 w-3" />
                        {airingTimeStr}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({airingDateShort} • {formatTimeRemaining(item.airingAt)})
                      </span>
                    </div>

                    <h3 className="font-display text-sm font-bold text-white truncate group-hover:text-kurama transition-colors">
                      {item.title}
                    </h3>

                    {item.averageScore && (
                      <div className="flex items-center gap-1 text-[11px] text-amber-300 font-semibold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{(item.averageScore / 10).toFixed(1)} en AniList</span>
                      </div>
                    )}
                  </div>

                  {item.siteUrl && (
                    <a
                      href={item.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver ${item.title} en AniList`}
                      className="rounded-xl p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
              <Sparkles className="h-7 w-7 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                No hay episodios en emisión para este filtro en el día seleccionado
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prueba seleccionando otro día de la semana.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
