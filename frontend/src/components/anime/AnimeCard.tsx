'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Star,
  Plus,
  Radio,
  Tv,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Media, MediaListEntry } from '@/types/anilist';

export interface AnimeCardProps {
  media: Media;
  entry?: MediaListEntry | null;
  onSelect: (media: Media, entry?: MediaListEntry | null) => void;
  onQuickIncrement?: (entry: MediaListEntry, e: React.MouseEvent<HTMLButtonElement>) => void;
  isUpdating?: boolean;
}

export function AnimeCard({
  media,
  entry,
  onSelect,
  onQuickIncrement,
  isUpdating = false,
}: AnimeCardProps): React.JSX.Element {
  const title =
    media.title.userPreferred ||
    media.title.romaji ||
    media.title.english ||
    'Anime';

  const coverUrl =
    media.coverImage.extraLarge ||
    media.coverImage.large ||
    media.coverImage.medium ||
    '/icon-192.png';

  const totalEpisodes = media.episodes ?? null;
  const currentProgress = entry?.progress ?? 0;
  const progressPercentage =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(100, Math.round((currentProgress / totalEpisodes) * 100))
      : currentProgress > 0
        ? 50
        : 0;

  const isReleasing = media.status === 'RELEASING';
  const scoreDisplay =
    entry && entry.score > 0
      ? entry.score.toFixed(1)
      : media.averageScore
        ? (media.averageScore / 10).toFixed(1)
        : null;

  const canIncrement =
    Boolean(entry) &&
    Boolean(onQuickIncrement) &&
    (totalEpisodes === null || currentProgress < totalEpisodes);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.22 }}
      onClick={() => onSelect(media, entry)}
      className="bento-card group relative flex flex-col overflow-hidden cursor-pointer select-none"
    >
      {/* Portada con aspect-ratio 2/3 y next/image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradiente oscuro inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        {/* Badges Superiores: Estado Emisión + Formato */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5">
          {isReleasing ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-950 shadow-md backdrop-blur-md">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              Emisión
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-200 backdrop-blur-md">
              <Tv className="h-2.5 w-2.5 text-kurama" />
              {media.format ?? 'TV'}
            </span>
          )}

          {scoreDisplay && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 border border-amber-400/40 px-2 py-0.5 text-[11px] font-extrabold text-amber-300 backdrop-blur-md">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {scoreDisplay}
            </span>
          )}
        </div>

        {/* Botón flotante de +1 Episodio Optimista */}
        {canIncrement && entry && onQuickIncrement && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation();
              onQuickIncrement(entry, e);
            }}
            aria-label={`Sumar 1 episodio a ${title}`}
            className={cn(
              'absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-xl bg-kurama px-2.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-lg transition-all hover:scale-105 hover:brightness-110 active:scale-95',
              isUpdating && 'opacity-70 animate-pulse'
            )}
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>1 Ep</span>
          </button>
        )}

        {/* Indicador de próximo episodio si está en emisión */}
        {media.nextAiringEpisode && (
          <div className="absolute bottom-3 left-2.5 right-16 truncate">
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/20 border border-sky-400/40 px-1.5 py-0.5 text-[10px] font-bold text-sky-200 backdrop-blur-md">
              <Sparkles className="h-2.5 w-2.5 text-sky-400" />
              Ep. {media.nextAiringEpisode.episode} pronto
            </span>
          </div>
        )}
      </div>

      {/* Pie de Tarjeta: Título + Barra de Progreso */}
      <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2.5">
        <h3 className="font-display text-sm font-bold leading-snug text-white line-clamp-2 group-hover:text-kurama transition-colors">
          {title}
        </h3>

        {entry ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold text-slate-300">
                {currentProgress} / {totalEpisodes ?? '?'} ep.
              </span>
              <span className="text-kurama font-bold">{progressPercentage}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950 border border-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-kurama-500 to-amber-300 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-white/[0.06]">
            <span>{media.seasonYear ?? 'Anime'}</span>
            <span>{totalEpisodes ? `${totalEpisodes} episodios` : 'En curso'}</span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function AnimeGridSkeleton({ count = 12 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bento-card overflow-hidden animate-pulse flex flex-col"
        >
          <div className="aspect-[2/3] w-full bg-white/[0.06]" />
          <div className="p-3.5 space-y-2">
            <div className="h-4 w-4/5 rounded bg-white/[0.08]" />
            <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}
