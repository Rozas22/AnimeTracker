'use client';

import React, { useState, useMemo, useOptimistic, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search,
  ListVideo,
  Sparkles,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimeCard } from './AnimeCard';
import { AnimeDetailModal } from './AnimeDetailModal';
import { saveAnimeProgressAction } from '@/lib/anilist/actions';
import type {
  Media,
  MediaListEntry,
  MediaListStatus,
} from '@/types/anilist';

export interface MyListClientViewProps {
  initialEntries: MediaListEntry[];
  anilistUserId: number;
}

const STATUS_TABS: ReadonlyArray<{
  key: MediaListStatus | 'ALL';
  label: string;
}> = [
  { key: 'CURRENT', label: 'Viendo' },
  { key: 'PLANNING', label: 'Planeo Ver' },
  { key: 'COMPLETED', label: 'Completados' },
  { key: 'PAUSED', label: 'En Pausa' },
  { key: 'DROPPED', label: 'Abandonados' },
  { key: 'ALL', label: 'Todos' },
];

export function MyListClientView({
  initialEntries,
  anilistUserId,
}: MyListClientViewProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // Estado sincronizado con URL searchParams (?status=CURRENT&q=...)
  const currentStatusParam =
    (searchParams.get('status') as MediaListStatus | 'ALL' | null) ?? 'CURRENT';
  const currentQueryParam = searchParams.get('q') ?? '';

  const [entries, setEntries] = useState<MediaListEntry[]>(initialEntries);
  const [searchInput, setSearchInput] = useState<string>(currentQueryParam);
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [activeModalItem, setActiveModalItem] = useState<{
    media: Media;
    entry: MediaListEntry | null;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Optimistic UI para que +1 episodio sea instantáneo
  const [optimisticEntries, applyOptimisticUpdate] = useOptimistic<
    MediaListEntry[],
    { mediaId: number; progress: number; status?: MediaListStatus; score?: number }
  >(entries, (state, update) =>
    state.map((item) =>
      item.mediaId === update.mediaId
        ? {
            ...item,
            progress: update.progress,
            status: update.status ?? item.status,
            score: update.score ?? item.score,
          }
        : item
    )
  );

  const updateUrlParams = (nextStatus: string, nextQuery: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus && nextStatus !== 'CURRENT') {
      params.set('status', nextStatus);
    } else {
      params.delete('status');
    }
    if (nextQuery.trim()) {
      params.set('q', nextQuery.trim());
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Conteos por pestaña
  const countsByStatus = useMemo(() => {
    const map: Record<string, number> = {
      ALL: optimisticEntries.length,
      CURRENT: 0,
      PLANNING: 0,
      COMPLETED: 0,
      PAUSED: 0,
      DROPPED: 0,
    };
    for (const item of optimisticEntries) {
      map[item.status] = (map[item.status] ?? 0) + 1;
    }
    return map;
  }, [optimisticEntries]);

  const filteredEntries = useMemo(() => {
    return optimisticEntries.filter((entry) => {
      if (currentStatusParam !== 'ALL' && entry.status !== currentStatusParam) {
        return false;
      }
      if (selectedFormat !== 'ALL' && entry.media.format !== selectedFormat) {
        return false;
      }
      if (searchInput.trim()) {
        const q = searchInput.toLowerCase();
        const titleMatch =
          entry.media.title.userPreferred?.toLowerCase().includes(q) ||
          entry.media.title.romaji?.toLowerCase().includes(q) ||
          entry.media.title.english?.toLowerCase().includes(q);
        if (!titleMatch) return false;
      }
      return true;
    });
  }, [optimisticEntries, currentStatusParam, selectedFormat, searchInput]);

  // Incremento rápido +1 Episodio con Optimistic UI + Server Action
  const handleQuickIncrement = (entry: MediaListEntry): void => {
    const maxEps = entry.media.episodes ?? 9999;
    const nextProgress = Math.min(maxEps, entry.progress + 1);
    const nextStatus: MediaListStatus =
      entry.media.episodes && nextProgress >= entry.media.episodes
        ? 'COMPLETED'
        : entry.status;

    startTransition(async () => {
      applyOptimisticUpdate({
        mediaId: entry.mediaId,
        progress: nextProgress,
        status: nextStatus,
      });

      setEntries((prev) =>
        prev.map((item) =>
          item.mediaId === entry.mediaId
            ? { ...item, progress: nextProgress, status: nextStatus }
            : item
        )
      );

      await saveAnimeProgressAction({
        anilistUserId,
        mediaId: entry.mediaId,
        progress: nextProgress,
        status: nextStatus,
        totalEpisodesDelta: 1,
      });
    });
  };

  const handleSaveFromModal = async (payload: {
    mediaId: number;
    status: MediaListStatus;
    progress: number;
    score: number;
  }): Promise<void> => {
    const existing = entries.find((e) => e.mediaId === payload.mediaId);
    const delta = payload.progress - (existing?.progress ?? 0);

    startTransition(async () => {
      applyOptimisticUpdate(payload);
      setEntries((prev) =>
        prev.map((item) =>
          item.mediaId === payload.mediaId
            ? {
                ...item,
                status: payload.status,
                progress: payload.progress,
                score: payload.score,
              }
            : item
        )
      );

      await saveAnimeProgressAction({
        anilistUserId,
        mediaId: payload.mediaId,
        status: payload.status,
        progress: payload.progress,
        scoreRaw: Math.round(payload.score * 10),
        totalEpisodesDelta: delta,
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de Mi Lista */}
      <div className="bento-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-popover text-white">
            <ListVideo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
              Mi Colección de Anime
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sincronizada con tu cuenta de AniList.
            </p>
          </div>
        </div>

        {/* Buscador rápido local + Filtro de Formato */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                updateUrlParams(currentStatusParam, e.target.value);
              }}
              placeholder="Filtrar en mi lista..."
              className="w-full rounded-xl bg-background/80 border border-white/10 pl-9 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-kurama"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-background/80 border border-white/10 px-2.5 py-1.5">
            <Filter className="h-3.5 w-3.5 text-kurama" />
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">Formato: Todos</option>
              <option value="TV" className="bg-slate-900">TV</option>
              <option value="MOVIE" className="bg-slate-900">Películas</option>
              <option value="OVA" className="bg-slate-900">OVA</option>
              <option value="ONA" className="bg-slate-900">ONA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pestañas de Estado sincronizadas con URL */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatusParam === tab.key;
          const count = countsByStatus[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => updateUrlParams(tab.key, searchInput)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border',
                isActive
                  ? 'bg-kurama text-slate-950 border-kurama'
                  : 'bg-card/70 text-muted-foreground border-white/[0.08] hover:text-white hover:border-white/20'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  isActive
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-white/[0.07] text-slate-300'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de Tarjetas de Anime */}
      {filteredEntries.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredEntries.map((entry) => (
            <AnimeCard
              key={entry.mediaId}
              media={entry.media}
              entry={entry}
              isUpdating={isPending}
              onQuickIncrement={(item) => handleQuickIncrement(item)}
              onSelect={(media, item) =>
                setActiveModalItem({ media, entry: item ?? null })
              }
            />
          ))}
        </div>
      ) : (
        <div className="bento-card flex flex-col items-center justify-center py-16 text-center">
          <ListVideo className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-display text-base font-bold text-white">
            No se encontraron animes en esta pestaña
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Prueba a cambiar el filtro de estado o busca nuevos títulos en el Buscador.
          </p>
        </div>
      )}

      {/* Modal de Detalle y Edición */}
      <AnimeDetailModal
        media={activeModalItem?.media ?? null}
        entry={activeModalItem?.entry ?? null}
        onClose={() => setActiveModalItem(null)}
        onSaveProgress={handleSaveFromModal}
      />
    </div>
  );
}
