'use client';

import React from 'react';
import { PosterTile } from '@/components/wall/PosterTile';
import type { Media, MediaListEntry } from '@/types/anilist';

export interface AnimeCardProps {
  media: Media;
  entry?: MediaListEntry | null;
  onSelect: (media: Media, entry?: MediaListEntry | null) => void;
  onQuickIncrement?: (entry: MediaListEntry, e?: React.MouseEvent<HTMLButtonElement>) => void;
  isUpdating?: boolean;
}

const dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Cartel del catálogo y de Mi Lista: el mismo cartel 3D del Muro de Streaming
 * ocupando su celda de la rejilla.
 */
export function AnimeCard({
  media,
  entry,
  onSelect,
  onQuickIncrement,
  isUpdating = false,
}: AnimeCardProps): React.JSX.Element {
  const title = media.title.userPreferred || media.title.romaji || media.title.english || 'Anime';
  const coverUrl = media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium || null;
  const total = media.episodes ?? null;
  const progress = entry?.progress ?? 0;
  const pct = entry ? (total && total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : progress > 0 ? 50 : 0) : null;
  const score = entry && entry.score > 0 ? entry.score : media.averageScore ? media.averageScore / 10 : null;
  const next = media.nextAiringEpisode;
  const canIncrement = Boolean(entry && onQuickIncrement) && (total === null || progress < total);

  const meta = entry
    ? `Ep ${progress}${total ? ` de ${total}` : ''}`
    : [media.seasonYear, total ? `${total} ep` : media.status === 'RELEASING' ? 'En emisión' : null].filter(Boolean).join(' · ');

  return (
    <PosterTile
      className="w-full"
      title={title}
      coverUrl={coverUrl}
      tint={media.coverImage.color}
      meta={meta}
      badge={next ? `Ep ${next.episode} · ${dayFmt.format(new Date(next.airingAt * 1000))}` : undefined}
      badgeTone={next ? 'live' : 'neutral'}
      score={score}
      progress={pct}
      onSelect={() => onSelect(media, entry)}
      onIncrement={canIncrement && entry && onQuickIncrement ? () => onQuickIncrement(entry) : undefined}
      isBusy={isUpdating}
    />
  );
}

export function AnimeGridSkeleton({ count = 12 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="aspect-[2/3] w-full animate-pulse rounded-[10px] bg-card" />
      ))}
    </div>
  );
}
