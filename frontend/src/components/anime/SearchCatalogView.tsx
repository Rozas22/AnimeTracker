'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { AnimeCard, AnimeGridSkeleton } from './AnimeCard';
import { AnimeDetailModal } from './AnimeDetailModal';
import {
  searchAnimeCatalogAction,
  saveAnimeProgressAction,
} from '@/lib/anilist/actions';
import type {
  Media,
  MediaFormat,
  MediaStatus,
  MediaListStatus,
} from '@/types/anilist';

export interface SearchCatalogViewProps {
  initialMedia: Media[];
  initialHasNextPage: boolean;
  anilistUserId: number;
}

const GENRE_OPTIONS: readonly string[] = [
  'ALL',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

export function SearchCatalogView({
  initialMedia,
  initialHasNextPage,
  anilistUserId,
}: SearchCatalogViewProps): React.JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [format, setFormat] = useState<MediaFormat | 'ALL'>('ALL');
  const [status, setStatus] = useState<MediaStatus | 'ALL'>('ALL');
  const [genre, setGenre] = useState<string>('ALL');

  const [results, setResults] = useState<Media[]>(initialMedia);
  const [page, setPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(initialHasNextPage);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  const [isSearching, startSearchTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  // Búsqueda con debounce de 380ms a través del Server Proxy con caché
  useEffect(() => {
    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        const res = await searchAnimeCatalogAction({
          query: query.trim() || undefined,
          page: 1,
          perPage: 18,
          format,
          status,
          genre,
        });

        if (res.rateLimited && res.error) {
          setRateLimitWarning(res.error);
          return;
        }

        setRateLimitWarning(null);
        if (res.data) {
          setResults(res.data.media);
          setHasNextPage(res.data.pageInfo.hasNextPage);
          setPage(1);
        }
      });
    }, 380);

    return () => clearTimeout(timer);
  }, [query, format, status, genre]);

  const handleLoadMore = (): void => {
    const nextPage = page + 1;
    startLoadMoreTransition(async () => {
      const res = await searchAnimeCatalogAction({
        query: query.trim() || undefined,
        page: nextPage,
        perPage: 18,
        format,
        status,
        genre,
      });

      if (res.data) {
        setResults((prev) => [...prev, ...res.data!.media]);
        setHasNextPage(res.data.pageInfo.hasNextPage);
        setPage(nextPage);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera y Barra de Búsqueda */}
      <div className="bento-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-400/35 text-sky-400">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
                Explorar Catálogo de AniList
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <Sparkles className="h-3 w-3" />
                  Caché Edge 1h
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Búsqueda instantánea protegida por Server Actions para evitar bloqueos 429.
              </p>
            </div>
          </div>
        </div>

        {/* Input Principal + Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe el nombre de un anime (ej. Solo Leveling, Jujutsu Kaisen, One Piece)..."
              className="w-full rounded-xl bg-background/90 border border-white/15 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-kurama"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5 rounded-xl bg-background/90 border border-white/15 px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-kurama shrink-0" />
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as MediaFormat | 'ALL')}
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">Formato: Todos</option>
              <option value="TV" className="bg-slate-900">TV</option>
              <option value="MOVIE" className="bg-slate-900">Película</option>
              <option value="OVA" className="bg-slate-900">OVA</option>
              <option value="ONA" className="bg-slate-900">ONA</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5 rounded-xl bg-background/90 border border-white/15 px-3 py-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MediaStatus | 'ALL')}
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">Estado: Todos</option>
              <option value="RELEASING" className="bg-slate-900">En Emisión</option>
              <option value="FINISHED" className="bg-slate-900">Finalizado</option>
              <option value="NOT_YET_RELEASED" className="bg-slate-900">Próximamente</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5 rounded-xl bg-background/90 border border-white/15 px-3 py-2">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g} className="bg-slate-900">
                  {g === 'ALL' ? 'Género: Todos' : g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Aviso si AniList reporta Rate Limit temporal */}
      {rateLimitWarning && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <span>{rateLimitWarning} Mostrando últimos resultados en caché.</span>
        </div>
      )}

      {/* Resultados o Skeletons */}
      {isSearching ? (
        <AnimeGridSkeleton count={12} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((media) => (
              <AnimeCard
                key={media.id}
                media={media}
                onSelect={(m) => setSelectedMedia(m)}
              />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 rounded-2xl bg-card hover:bg-white/[0.08] border border-kurama/40 px-6 py-3 text-xs font-extrabold text-kurama shadow-lg transition-all"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando más animes...
                  </>
                ) : (
                  'Cargar más resultados'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal para ver sinopsis, dónde verlo y añadir a Mi Lista */}
      <AnimeDetailModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        onSaveProgress={async (payload: {
          mediaId: number;
          status: MediaListStatus;
          progress: number;
          score: number;
        }) => {
          await saveAnimeProgressAction({
            anilistUserId,
            mediaId: payload.mediaId,
            status: payload.status,
            progress: payload.progress,
            scoreRaw: Math.round(payload.score * 10),
            totalEpisodesDelta: payload.progress,
          });
        }}
      />
    </div>
  );
}
