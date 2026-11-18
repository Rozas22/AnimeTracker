'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Tv,
  ExternalLink,
  Check,
  Plus,
  Minus,
  Sparkles,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Media,
  MediaListEntry,
  MediaListStatus,
} from '@/types/anilist';

export interface AnimeDetailModalProps {
  media: Media | null;
  entry?: MediaListEntry | null;
  onClose: () => void;
  onSaveProgress?: (payload: {
    mediaId: number;
    status: MediaListStatus;
    progress: number;
    score: number;
  }) => Promise<void>;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: MediaListStatus; label: string }> = [
  { value: 'CURRENT', label: 'Viendo' },
  { value: 'PLANNING', label: 'Planeo Ver' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'PAUSED', label: 'En Pausa' },
  { value: 'DROPPED', label: 'Abandonado' },
];

export function AnimeDetailModal({
  media,
  entry,
  onClose,
  onSaveProgress,
}: AnimeDetailModalProps): React.JSX.Element | null {
  const [status, setStatus] = useState<MediaListStatus>(entry?.status ?? 'CURRENT');
  const [progress, setProgress] = useState<number>(entry?.progress ?? 0);
  const [score, setScore] = useState<number>(entry?.score ?? 8);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (media) {
      setStatus(entry?.status ?? 'CURRENT');
      setProgress(entry?.progress ?? 0);
      setScore(entry?.score && entry.score > 0 ? entry.score : 8);
      setSavedSuccess(false);
    }
  }, [media, entry]);

  if (!media) return null;

  const title =
    media.title.userPreferred ||
    media.title.romaji ||
    media.title.english ||
    'Anime';

  const coverUrl =
    media.coverImage.extraLarge ||
    media.coverImage.large ||
    '/icon-192.png';

  const cleanDescription = (media.description ?? 'Sin sinopsis disponible.')
    .replace(/<[^>]*>?/gm, '')
    .trim();

  const streamingLinks = (media.externalLinks ?? []).filter(
    (link) => !link.isDisabled && (link.type === 'STREAMING' || link.site)
  );

  const maxEpisodes = media.episodes ?? 9999;

  const handleSave = async (): Promise<void> => {
    if (!onSaveProgress) {
      onClose();
      return;
    }
    setIsSaving(true);
    try {
      await onSaveProgress({
        mediaId: media.id,
        status,
        progress,
        score,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 650);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.94, y: 18, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 18, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bento-card relative w-full max-w-2xl overflow-hidden border-kurama/35 my-8"
        >
          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute top-4 right-4 z-20 rounded-full bg-slate-950/80 border border-white/15 p-2 text-slate-300 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Cabecera con Banner o Gradiente */}
          <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-kurama/25 via-slate-900 to-sky-500/20 overflow-hidden">
            {media.bannerImage && (
              <Image
                src={media.bannerImage}
                alt=""
                fill
                sizes="672px"
                className="object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          </div>

          {/* Cuerpo Principal */}
          <div className="relative z-10 -mt-16 px-6 pb-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="relative h-36 w-24 sm:h-40 sm:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-kurama/50 shadow-2xl bg-slate-950">
                <Image
                  src={coverUrl}
                  alt={title}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>

              <div className="space-y-2 pt-2 sm:pt-12 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-kurama/20 border border-kurama/40 px-2 py-0.5 text-[11px] font-bold text-kurama">
                    {media.format ?? 'TV'}
                  </span>
                  {media.averageScore && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-xs font-bold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {(media.averageScore / 10).toFixed(1)}
                    </span>
                  )}
                  {media.seasonYear && (
                    <span className="text-xs text-muted-foreground">
                      {media.season} {media.seasonYear}
                    </span>
                  )}
                </div>

                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white leading-tight">
                  {title}
                </h2>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {media.genres.slice(0, 5).map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 text-[11px] text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sinopsis */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sinopsis
              </h3>
              <p className="max-h-28 overflow-y-auto text-xs sm:text-sm text-slate-300 leading-relaxed pr-1">
                {cleanDescription}
              </p>
            </div>

            {/* Dónde verlo (Streaming Links) */}
            {streamingLinks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-kurama" />
                  Dónde Verlo Oficialmente
                </h3>
                <div className="flex flex-wrap gap-2">
                  {streamingLinks.slice(0, 6).map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-kurama/20 border border-white/[0.1] hover:border-kurama/40 px-3 py-1.5 text-xs font-semibold text-white transition-all"
                    >
                      <span>{link.site}</span>
                      <ExternalLink className="h-3 w-3 text-kurama" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Editor de Progreso y Estado */}
            <div className="rounded-2xl bg-background/80 border border-white/[0.08] p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Estado */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Estado en tu Lista
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MediaListStatus)}
                    className="w-full rounded-xl bg-card border border-white/15 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-kurama"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progreso de Episodios */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Episodios ({progress} / {media.episodes ?? '?'})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProgress((p) => Math.max(0, p - 1))}
                      className="rounded-xl bg-white/[0.07] hover:bg-white/15 p-2 text-white"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={maxEpisodes}
                      value={progress}
                      onChange={(e) =>
                        setProgress(
                          Math.min(maxEpisodes, Math.max(0, Number(e.target.value) || 0))
                        )
                      }
                      className="w-full rounded-xl bg-card border border-white/15 px-2 py-1.5 text-center text-xs font-bold text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setProgress((p) => Math.min(maxEpisodes, p + 1))}
                      className="rounded-xl bg-kurama/20 hover:bg-kurama/30 border border-kurama/40 p-2 text-kurama"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nota */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tu Nota (0 - 10)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={score}
                    onChange={(e) =>
                      setScore(Math.min(10, Math.max(0, Number(e.target.value) || 0)))
                    }
                    className="w-full rounded-xl bg-card border border-white/15 px-3 py-2 text-xs font-bold text-amber-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSave()}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-kurama-500 to-amber-600 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg transition-all hover:brightness-110',
                    isSaving && 'opacity-70'
                  )}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      ¡Guardado (+PL)!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {isSaving ? 'Sincronizando...' : 'Guardar Progreso'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
