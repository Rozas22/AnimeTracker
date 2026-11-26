'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ExternalLink, Check, Plus, Minus, Sparkles, Play, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAnimeMediaAction, getFranchiseScoresAction, type FranchiseEntry } from '@/lib/anilist/franchise';
import { completeSeasonsAction } from '@/lib/anilist/actions';
import { refreshCollectionCache } from '@/lib/anilist/client-save';
import { getSpanishSynopsisAction } from '@/lib/anilist/synopsis';
import { SagaPanel } from './SagaPanel';
import type { Media, MediaListEntry, MediaListStatus } from '@/types/anilist';

export interface SavePayload {
  mediaId: number;
  status: MediaListStatus;
  progress: number;
  score: number;
}

export interface AnimeDetailModalProps {
  media: Media | null;
  entry?: MediaListEntry | null;
  onClose: () => void;
  onSaveProgress?: (payload: SavePayload) => Promise<void>;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: MediaListStatus; label: string }> = [
  { value: 'CURRENT', label: 'Viendo' },
  { value: 'PLANNING', label: 'Planeo Ver' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'PAUSED', label: 'En Pausa' },
  { value: 'DROPPED', label: 'Abandonado' },
];

interface Mine {
  status: MediaListStatus;
  progress: number;
  score: number;
}

const titleOf = (m: Media): string => m.title.userPreferred || m.title.romaji || m.title.english || 'Anime';

export function AnimeDetailModal({ media, entry, onClose, onSaveProgress }: AnimeDetailModalProps): React.JSX.Element | null {
  // Temporadas abiertas dentro de la misma tarjeta (la última es la visible)
  const [stack, setStack] = useState<Media[]>([]);
  const [opening, setOpening] = useState<number | null>(null);
  const [franchise, setFranchise] = useState<FranchiseEntry[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saved, setSaved] = useState<Map<number, Mine>>(new Map());
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const [status, setStatus] = useState<MediaListStatus>('CURRENT');
  const [progress, setProgress] = useState<number>(0);
  const [score, setScore] = useState<number>(8);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [synopsis, setSynopsis] = useState<{ id: number; text: string | null; loading: boolean } | null>(null);
  const dirty = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const current = stack[stack.length - 1] ?? media;
  const router = useRouter();

  // Si has guardado otras temporadas, la lista de fondo se actualiza al cerrar
  const close = (): void => {
    if (media && Array.from(saved.keys()).some((id) => id !== media.id)) router.refresh();
    onClose();
  };

  // Nueva tarjeta desde fuera: se empieza de cero
  useEffect(() => {
    setStack([]);
    setSaved(new Map());
    setNotice(null);
  }, [media?.id]);

  useEffect(() => {
    if (!current) return;
    let alive = true;
    void getFranchiseScoresAction(current.id)
      .then((rows) => alive && setFranchise(rows))
      .catch(() => alive && setFranchise([]));
    return () => {
      alive = false;
    };
  }, [current?.id, reloadKey]);

  // Sinopsis en español: se muestra la original mientras llega la traducción
  useEffect(() => {
    if (!current?.description) return;
    let alive = true;
    const id = current.id;
    setSynopsis({ id, text: null, loading: true });
    void getSpanishSynopsisAction(id)
      .then((text) => alive && setSynopsis({ id, text, loading: false }))
      .catch(() => alive && setSynopsis({ id, text: null, loading: false }));
    return () => {
      alive = false;
    };
  }, [current?.id, current?.description]);

  // Lo guardado en esta tarjeta manda sobre lo que tarde en llegar de AniList
  const entries = useMemo<FranchiseEntry[] | null>(
    () =>
      franchise?.map((e) => {
        const mine = saved.get(e.mediaId);
        return mine ? { ...e, myStatus: mine.status, myProgress: mine.progress, myScore: mine.score > 0 ? mine.score : e.myScore } : e;
      }) ?? null,
    [franchise, saved]
  );

  const mine: Mine | null = useMemo(() => {
    if (!current) return null;
    const local = saved.get(current.id);
    if (local) return local;
    if (media && current.id === media.id && entry) return { status: entry.status, progress: entry.progress, score: entry.score };
    const fromSaga = franchise?.find((e) => e.mediaId === current.id);
    if (fromSaga?.myStatus) return { status: fromSaga.myStatus, progress: fromSaga.myProgress ?? 0, score: fromSaga.myScore ?? 0 };
    return null;
  }, [current, saved, media, entry, franchise]);

  // Rellena el editor al cambiar de temporada, sin pisar lo que estés escribiendo
  const mineKey = mine ? `${mine.status}|${mine.progress}|${mine.score}` : 'none';
  useEffect(() => {
    dirty.current = false;
    setSavedSuccess(false);
  }, [current?.id]);
  useEffect(() => {
    if (!current || dirty.current) return;
    setStatus(mine?.status ?? 'CURRENT');
    setProgress(mine?.progress ?? 0);
    setScore(mine && mine.score > 0 ? mine.score : 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, mineKey]);

  const remember = useCallback((payload: SavePayload) => {
    setSaved((prev) => new Map(prev).set(payload.mediaId, { status: payload.status, progress: payload.progress, score: payload.score }));
  }, []);

  const openSeason = useCallback(
    async (mediaId: number) => {
      if (opening) return;
      setOpening(mediaId);
      setNotice(null);
      const next = await getAnimeMediaAction(mediaId).catch(() => null);
      setOpening(null);
      if (!next) {
        setNotice('No se pudo abrir esa temporada. Inténtalo de nuevo.');
        return;
      }
      setStack((prev) => [...prev, next]);
      scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [opening]
  );

  const completeSeasons = useCallback(
    async (list: FranchiseEntry[]) => {
      if (!media || list.length === 0) return;
      setNotice(list.length > 1 ? `Guardando ${list.length} temporadas y películas…` : null);
      setBusyIds(new Set(list.map((e) => e.mediaId)));
      const payloadOf = (e: FranchiseEntry): SavePayload => ({
        mediaId: e.mediaId,
        status: 'COMPLETED',
        progress: e.episodes ?? e.myProgress ?? 0,
        score: e.myScore ?? 0,
      });
      let done = 0;
      // La temporada de la tarjeta va por la lista de fondo para que se actualice al momento
      const own = list.find((e) => e.mediaId === media.id);
      if (own && onSaveProgress) {
        try {
          await onSaveProgress(payloadOf(own));
          remember(payloadOf(own));
          done += 1;
        } catch {
          /* se informa abajo */
        }
      }
      const rest = list.filter((e) => e.mediaId !== media.id || !onSaveProgress);
      if (rest.length) {
        const res = await completeSeasonsAction(
          rest.map((e) => ({ mediaId: e.mediaId, episodes: e.episodes ?? e.myProgress ?? 0, previousProgress: e.myProgress ?? 0, score: e.myScore ?? 0 }))
        ).catch(() => ({ saved: [] as number[], failed: rest.map((e) => e.mediaId) }));
        refreshCollectionCache();
        for (const e of rest) {
          if (res.saved.includes(e.mediaId)) {
            remember(payloadOf(e));
            done += 1;
          }
        }
      }
      setBusyIds(new Set());
      setNotice(done === list.length ? (done === 1 ? 'Marcada como vista' : `${done} marcadas como vistas`) : 'Algunas no se pudieron guardar. Inténtalo de nuevo.');
      setReloadKey((k) => k + 1);
    },
    [media, onSaveProgress, remember]
  );

  if (!media || !current) return null;

  const title = titleOf(current);
  const coverUrl = current.coverImage.extraLarge || current.coverImage.large || '/icon-192.png';
  const cleanDescription = (current.description ?? 'Sin sinopsis disponible.').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').trim();
  const translated = synopsis?.id === current.id ? synopsis : null;
  const streamingLinks = (current.externalLinks ?? []).filter((link) => !link.isDisabled && (link.type === 'STREAMING' || link.site));
  const maxEpisodes = current.episodes ?? 9999;
  const totalEpisodes = current.episodes && current.episodes > 0 ? current.episodes : null;
  const previous = stack.length > 1 ? stack[stack.length - 2]! : stack.length === 1 ? media : null;

  // El estado sigue al progreso: al marcar el último episodio pasa a Completado,
  // y al empezar algo que tenías en "Planeo ver" pasa a Viendo.
  const changeProgress = (raw: number): void => {
    dirty.current = true;
    const next = Math.min(maxEpisodes, Math.max(0, Math.trunc(raw) || 0));
    setProgress(next);
    if (totalEpisodes && next >= totalEpisodes) setStatus('COMPLETED');
    else if (status === 'COMPLETED' && totalEpisodes && next < totalEpisodes) setStatus('CURRENT');
    else if (status === 'PLANNING' && next > 0) setStatus('CURRENT');
  };

  const changeStatus = (next: MediaListStatus): void => {
    dirty.current = true;
    setStatus(next);
    if (next === 'COMPLETED' && totalEpisodes) setProgress(totalEpisodes);
  };

  // Guardar no cierra la tarjeta: puedes seguir con la siguiente temporada
  const handleSave = async (): Promise<void> => {
    if (!onSaveProgress) {
      close();
      return;
    }
    setIsSaving(true);
    try {
      const payload: SavePayload = { mediaId: current.id, status, progress, score };
      await onSaveProgress(payload);
      remember(payload);
      dirty.current = false;
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 1800);
      setReloadKey((k) => k + 1);
    } catch {
      setNotice('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={scroller}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/75 px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <motion.div
          initial={{ scale: 0.94, y: 18, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 18, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bento-card relative mx-auto my-4 w-full max-w-2xl overflow-hidden sm:my-12"
        >
          {/* Volver a la temporada anterior */}
          {previous && (
            <button
              type="button"
              onClick={() => setStack((prev) => prev.slice(0, -1))}
              className="absolute left-4 top-4 z-20 inline-flex max-w-[70%] items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/80 py-1.5 pl-2 pr-3 text-xs font-semibold text-slate-200 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">{titleOf(previous)}</span>
            </button>
          )}

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-slate-950/80 p-2 text-slate-300 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Cabecera con Banner o Gradiente */}
          <div className="relative h-36 w-full overflow-hidden bg-popover sm:h-44">
            {current.bannerImage && (
              <Image src={current.bannerImage} alt="" fill sizes="672px" unoptimized={current.bannerImage.startsWith('http')} className="object-cover opacity-40" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          </div>

          {/* Cuerpo Principal */}
          <div className="relative z-10 -mt-16 space-y-6 px-6 pb-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row">
              <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-kurama/50 bg-slate-950 shadow-2xl sm:h-40 sm:w-28">
                <Image src={coverUrl} alt={title} fill sizes="112px" unoptimized={coverUrl.startsWith('http')} className="object-cover" />
              </div>

              <div className="min-w-0 flex-1 space-y-2 pt-2 sm:pt-12">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-kurama/40 bg-kurama/20 px-2 py-0.5 text-[11px] font-bold text-kurama">{current.format ?? 'TV'}</span>
                  {current.averageScore && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {(current.averageScore / 10).toFixed(1)}
                    </span>
                  )}
                  {current.seasonYear && (
                    <span className="text-xs text-muted-foreground">
                      {current.season} {current.seasonYear}
                    </span>
                  )}
                </div>

                <h2 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">{title}</h2>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {current.genres.slice(0, 5).map((g) => (
                    <span key={g} className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-slate-300">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor de Progreso y Estado: arriba, para no tener que bajar a guardar */}
            <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-background/80 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor={`estado-${current.id}`} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Estado en tu Lista
                  </label>
                  <select
                    id={`estado-${current.id}`}
                    value={status}
                    onChange={(e) => changeStatus(e.target.value as MediaListStatus)}
                    className="w-full rounded-xl border border-white/15 bg-card px-3 py-2 text-base font-semibold text-white focus:border-kurama focus:outline-none sm:text-xs"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-900">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`episodios-${current.id}`} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Episodios ({progress} / {current.episodes ?? '?'})
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeProgress(progress - 1)} aria-label="Un episodio menos" className="rounded-xl bg-white/[0.07] p-2.5 text-white hover:bg-white/15">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      id={`episodios-${current.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={maxEpisodes}
                      value={progress}
                      onChange={(e) => changeProgress(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/15 bg-card px-2 py-1.5 text-center text-base font-bold text-white sm:text-xs"
                    />
                    <button type="button" onClick={() => changeProgress(progress + 1)} aria-label="Un episodio más" className="rounded-xl border border-kurama/40 bg-kurama/20 p-2.5 text-kurama hover:bg-kurama/30">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`nota-${current.id}`} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tu Nota (0 - 10)
                  </label>
                  <input
                    id={`nota-${current.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10}
                    step={0.5}
                    value={score}
                    onChange={(e) => {
                      dirty.current = true;
                      setScore(Math.min(10, Math.max(0, Number(e.target.value) || 0)));
                    }}
                    className="w-full rounded-xl border border-white/15 bg-card px-3 py-2 text-base font-bold text-amber-300 sm:text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-2">
                <button type="button" onClick={close} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white">
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSave()}
                  className={cn('inline-flex items-center gap-1.5 rounded-xl bg-kurama px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition-all hover:brightness-110', isSaving && 'opacity-70')}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      ¡Guardado!
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

            {(notice || opening) && (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-xs font-medium text-white">
                {opening && <Loader2 className="h-3.5 w-3.5 animate-spin text-kurama" aria-hidden="true" />}
                {opening ? 'Abriendo temporada…' : notice}
              </p>
            )}

            <SagaPanel entries={entries} currentId={current.id} busyIds={busyIds} onOpen={(id) => void openSeason(id)} onComplete={completeSeasons} />

            {/* Sinopsis */}
            <div className="space-y-1.5">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sinopsis
                {translated?.loading && (
                  <span className="inline-flex items-center gap-1 normal-case tracking-normal text-kurama">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    traduciendo…
                  </span>
                )}
              </h3>
              <p className="max-h-40 overflow-y-auto whitespace-pre-line pr-1 text-xs leading-relaxed text-slate-300 sm:text-sm" lang={translated?.text ? 'es' : 'en'}>
                {translated?.text ?? cleanDescription}
              </p>
              {translated && !translated.loading && !translated.text && current.description && (
                <p className="text-[11px] text-muted-foreground">Traducción no disponible ahora mismo: se muestra la original en inglés.</p>
              )}
            </div>

            {/* Dónde verlo (Streaming Links) */}
            {streamingLinks.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:border-kurama/40 hover:bg-kurama/20"
                    >
                      <span>{link.site}</span>
                      <ExternalLink className="h-3 w-3 text-kurama" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
