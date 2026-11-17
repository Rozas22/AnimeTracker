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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiringScheduleNode, MediaListEntry } from '@/types/anilist';

export interface AiringScheduleBentoProps {
  /** Lista de horarios de emisión directos de AniList */
  schedules?: AiringScheduleNode[];
  /** Alternativamente, entradas de la lista del usuario en estado CURRENT */
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
  airingAt: number; // Unix timestamp (segundos)
  dayOfWeek: number; // 0-6
  siteUrl: string | null;
}

/**
 * Genera horarios de demostración distribuidos en la semana actual si no se pasan datos reales.
 */
function buildDemoSchedules(): NormalizedAiringItem[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const currentDay = new Date().getDay();

  const demoList: Array<{
    mediaId: number;
    title: string;
    episode: number;
    dayOffset: number;
    hour: number;
    minute: number;
  }> = [
    {
      mediaId: 171018,
      title: 'Dan Da Dan',
      episode: 8,
      dayOffset: 0,
      hour: 17,
      minute: 0,
    },
    {
      mediaId: 163134,
      title: 'Re:ZERO -Starting Life in Another World- Season 3',
      episode: 7,
      dayOffset: 0,
      hour: 15,
      minute: 30,
    },
    {
      mediaId: 170942,
      title: 'Blue Lock vs. U-20 Japan',
      episode: 6,
      dayOffset: 1,
      hour: 16,
      minute: 0,
    },
    {
      mediaId: 169755,
      title: 'Bleach: Thousand-Year Blood War - The Conflict',
      episode: 7,
      dayOffset: 2,
      hour: 16,
      minute: 30,
    },
    {
      mediaId: 21,
      title: 'One Piece: Egghead Arc',
      episode: 1123,
      dayOffset: 3,
      hour: 9,
      minute: 30,
    },
    {
      mediaId: 166240,
      title: 'Shangri-La Frontier Season 2',
      episode: 6,
      dayOffset: 4,
      hour: 10,
      minute: 0,
    },
    {
      mediaId: 154587,
      title: 'Solo Leveling: Arise from the Shadow',
      episode: 1,
      dayOffset: 5,
      hour: 18,
      minute: 0,
    },
    {
      mediaId: 16498,
      title: 'Dragon Ball DAIMA',
      episode: 6,
      dayOffset: 6,
      hour: 16,
      minute: 45,
    },
  ];

  return demoList.map((item, idx) => {
    const targetDay = (currentDay + item.dayOffset) % 7;
    const date = new Date();
    date.setDate(date.getDate() + item.dayOffset);
    date.setHours(item.hour, item.minute, 0, 0);

    return {
      id: `demo-airing-${idx}`,
      mediaId: item.mediaId,
      title: item.title,
      coverUrl: '/icon-192.png',
      episode: item.episode,
      airingAt: Math.max(nowSec + 3600, Math.floor(date.getTime() / 1000)),
      dayOfWeek: targetDay,
      siteUrl: `https://anilist.co/anime/${item.mediaId}`,
    };
  });
}

function formatTimeRemaining(airingAtSec: number): string {
  const diffSec = airingAtSec - Math.floor(Date.now() / 1000);
  if (diffSec <= 0) return 'Emitido recientemente';

  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);

  if (days > 0) return `En ${days}d ${hours}h`;
  if (hours > 0) return `En ${hours}h ${mins}m`;
  return `En ${Math.max(1, mins)} min`;
}

export function AiringScheduleBento({
  schedules,
  watchingEntries,
}: AiringScheduleBentoProps): React.JSX.Element {
  const todayDayIndex = useMemo<number>(() => new Date().getDay(), []);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayIndex);

  // Normalizar entradas desde `schedules`, `watchingEntries` o fallback demo
  const normalizedItems = useMemo<NormalizedAiringItem[]>(() => {
    if (schedules && schedules.length > 0) {
      return schedules.map((node) => {
        const airingDate = new Date(node.airingAt * 1000);
        return {
          id: `sched-${node.id}`,
          mediaId: node.media.id,
          title:
            node.media.title.userPreferred ||
            node.media.title.romaji ||
            node.media.title.english ||
            'Anime',
          coverUrl:
            node.media.coverImage.large ||
            node.media.coverImage.medium ||
            '/icon-192.png',
          episode: node.episode,
          airingAt: node.airingAt,
          dayOfWeek: airingDate.getDay(),
          siteUrl: node.media.siteUrl,
        };
      });
    }

    if (watchingEntries && watchingEntries.length > 0) {
      const withNextEp = watchingEntries.filter(
        (entry) => entry.media.nextAiringEpisode !== null
      );

      if (withNextEp.length > 0) {
        return withNextEp.map((entry) => {
          const nextEp = entry.media.nextAiringEpisode!;
          const airingDate = new Date(nextEp.airingAt * 1000);
          return {
            id: `watch-${entry.id}-${nextEp.episode}`,
            mediaId: entry.media.id,
            title:
              entry.media.title.userPreferred ||
              entry.media.title.romaji ||
              'Anime',
            coverUrl:
              entry.media.coverImage.large ||
              entry.media.coverImage.medium ||
              '/icon-192.png',
            episode: nextEp.episode,
            airingAt: nextEp.airingAt,
            dayOfWeek: airingDate.getDay(),
            siteUrl: entry.media.siteUrl,
          };
        });
      }
    }

    return buildDemoSchedules();
  }, [schedules, watchingEntries]);

  const filteredByDay = useMemo<NormalizedAiringItem[]>(() => {
    return normalizedItems
      .filter((item) => item.dayOfWeek === selectedDay)
      .sort((a, b) => a.airingAt - b.airingAt);
  }, [normalizedItems, selectedDay]);

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
              Calendario de Emisión
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                <Radio className="h-3 w-3 animate-pulse" />
                En Vivo
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Horarios de estreno adaptados automáticamente a tu zona horaria local.
            </p>
          </div>
        </div>
      </div>

      {/* Selector de Días de la Semana */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 rounded-2xl bg-background/70 p-1.5 border border-white/[0.07]">
        {WEEK_DAYS.map((day) => {
          const isSelected = selectedDay === day.dayIndex;
          const isToday = todayDayIndex === day.dayIndex;
          const countForDay = normalizedItems.filter(
            (i) => i.dayOfWeek === day.dayIndex
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
                {countForDay > 0 && !isToday && (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-slate-950' : 'bg-emerald-400'
                    )}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lista de Episodios del Día Seleccionado */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
        >
          {filteredByDay.length > 0 ? (
            filteredByDay.map((item) => {
              const airingTimeStr = new Date(item.airingAt * 1000).toLocaleTimeString(
                'es-ES',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-background/60 p-3.5 transition-all hover:border-kurama/40 hover:bg-white/[0.03]"
                >
                  {/* Portada */}
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    <Image
                      src={item.coverUrl}
                      alt={item.title}
                      fill
                      sizes="48px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Información del Episodio */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-300">
                        Ep. {item.episode}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-kurama">
                        <Clock className="h-3 w-3" />
                        {airingTimeStr}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        • {formatTimeRemaining(item.airingAt)}
                      </span>
                    </div>

                    <h3 className="font-display text-sm font-bold text-white truncate">
                      {item.title}
                    </h3>
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
                Sin estrenos programados para este día
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona otro día de la semana o añade animes en emisión a tu lista.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
