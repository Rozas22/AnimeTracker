'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { saveAnimeProgressAction } from '@/lib/anilist/actions';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';
import { PosterRow } from './PosterRow';
import { PosterTile } from './PosterTile';
import type {
  AiringScheduleNode,
  Media,
  MediaListEntry,
  MediaListStatus,
} from '@/types/anilist';

export interface HomeWallProps {
  entries: MediaListEntry[];
  schedules: AiringScheduleNode[];
  anilistUserId: number;
  /** Contenido entre la primera fila y el resto (gráficos de estadísticas) */
  afterFirstRow?: React.ReactNode;
}

const TILE = 'w-[38vw] max-w-[172px] sm:w-[172px]';
const wdFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const hmFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });
/** "Dom 15:00" */
function shortWhen(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const wd = wdFmt.format(d).replace('.', '');
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${hmFmt.format(d)}`;
}

function titleOf(media: Media): string {
  return media.title.userPreferred || media.title.romaji || media.title.english || 'Anime';
}
function coverOf(media: Media): string | null {
  return media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium || null;
}
function progressOf(entry: MediaListEntry): number | null {
  const total = entry.media.episodes;
  if (!total) return entry.progress > 0 ? 50 : 0;
  return Math.min(100, Math.round((entry.progress / total) * 100));
}

function EmptyRow({ text, href, cta }: { text: string; href: string; cta: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] bg-card px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href={href} className="rounded-[10px] bg-popover px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent">
        {cta}
      </Link>
    </div>
  );
}

/**
 * Filas del Muro de Streaming en el perfil: sigues viendo, emisión de la semana,
 * tus mejores y pendientes. Incluye +1 episodio optimista y el modal de detalle.
 */
export function HomeWall({ entries: initialEntries, schedules, anilistUserId, afterFirstRow }: HomeWallProps): React.JSX.Element {
  const [entries, setEntries] = useState(initialEntries);
  const [modal, setModal] = useState<{ media: Media; entry: MediaListEntry | null } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const byMediaId = useMemo(() => new Map(entries.map((e) => [e.mediaId, e])), [entries]);

  const watching = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'CURRENT' || e.status === 'REPEATING')
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [entries]
  );

  const airing = useMemo(() => {
    const now = Date.now() / 1000;
    const week = now + 7 * 24 * 3600;
    const upcoming = schedules
      .filter((s) => s.airingAt >= now - 3600 && s.airingAt <= week)
      .sort((a, b) => a.airingAt - b.airingAt);
    const mine = upcoming.filter((s) => {
      const e = byMediaId.get(s.mediaId);
      return e && (e.status === 'CURRENT' || e.status === 'PLANNING' || e.status === 'REPEATING');
    });
    const seen = new Set<number>();
    return (mine.length > 0 ? mine : upcoming).filter((s) => (seen.has(s.mediaId) ? false : (seen.add(s.mediaId), true))).slice(0, 16);
  }, [schedules, byMediaId]);
  const airingIsMine = airing.some((s) => byMediaId.has(s.mediaId));

  const topRated = useMemo(
    () =>
      entries
        .filter((e) => (e.status === 'COMPLETED' || e.status === 'REPEATING') && e.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    [entries]
  );

  const planning = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'PLANNING')
        .sort((a, b) => (b.media.popularity ?? 0) - (a.media.popularity ?? 0)),
    [entries]
  );

  const increment = (entry: MediaListEntry): void => {
    const total = entry.media.episodes;
    const next = total ? Math.min(total, entry.progress + 1) : entry.progress + 1;
    const status: MediaListStatus = total && next >= total ? 'COMPLETED' : entry.status;
    setBusyId(entry.mediaId);
    setEntries((prev) => prev.map((e) => (e.mediaId === entry.mediaId ? { ...e, progress: next, status, updatedAt: Math.floor(Date.now() / 1000) } : e)));
    startTransition(async () => {
      await saveAnimeProgressAction({
        anilistUserId,
        mediaId: entry.mediaId,
        progress: next,
        status,
        totalEpisodesDelta: 1,
      });
      setBusyId(null);
    });
  };

  const saveFromModal = async (payload: { mediaId: number; status: MediaListStatus; progress: number; score: number }): Promise<void> => {
    const existing = byMediaId.get(payload.mediaId);
    const delta = payload.progress - (existing?.progress ?? 0);
    setEntries((prev) =>
      prev.map((e) => (e.mediaId === payload.mediaId ? { ...e, status: payload.status, progress: payload.progress, score: payload.score } : e))
    );
    startTransition(async () => {
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
    <>
      <div className="wall-rows space-y-6">
        <PosterRow
          title="Sigues viendo"
          note={watching.length > 0 ? `${watching.length} series` : undefined}
          seeAllHref="/lista?status=CURRENT"
          isEmpty={watching.length === 0}
          emptyState={<EmptyRow text="No estás viendo ninguna serie ahora mismo." href="/buscador" cta="Buscar un anime" />}
        >
          {watching.map((e, i) => {
            const next = e.media.nextAiringEpisode;
            const total = e.media.episodes;
            return (
              <PosterTile
                key={e.mediaId}
                className={i === 0 ? 'w-[78vw] max-w-[420px] sm:w-[420px]' : TILE}
                featured={i === 0}
                priority={i < 6}
                title={titleOf(e.media)}
                coverUrl={i === 0 ? (e.media.bannerImage ?? coverOf(e.media)) : coverOf(e.media)}
                tint={e.media.coverImage.color}
                meta={
                  i === 0 && next
                    ? `Ep ${e.progress}${total ? ` de ${total}` : ''} · el ep ${next.episode} sale el ${shortWhen(next.airingAt).toLowerCase()}`
                    : `Ep ${e.progress}${total ? ` de ${total}` : ''}`
                }
                badge={i === 0 ? 'Continúa aquí' : next ? shortWhen(next.airingAt) : undefined}
                badgeTone={next ? 'live' : 'neutral'}
                score={e.score}
                progress={progressOf(e)}
                onSelect={() => setModal({ media: e.media, entry: e })}
                onIncrement={!total || e.progress < total ? () => increment(e) : undefined}
                isBusy={isPending && busyId === e.mediaId}
              />
            );
          })}
        </PosterRow>

        {afterFirstRow}

        <PosterRow
          title={airingIsMine ? 'Se emite esta semana' : 'En emisión esta semana'}
          note={airing.length > 0 ? `${airing.length} episodios` : undefined}
          isEmpty={airing.length === 0}
          emptyState={<EmptyRow text="No hay emisiones previstas en los próximos 7 días." href="/buscador" cta="Explorar el catálogo" />}
        >
          {airing.map((s) => {
            const e = byMediaId.get(s.mediaId) ?? null;
            const soon = s.timeUntilAiring < 24 * 3600;
            return (
              <PosterTile
                key={s.id}
                className={TILE}
                title={titleOf(s.media)}
                coverUrl={coverOf(s.media)}
                tint={s.media.coverImage.color}
                badge={shortWhen(s.airingAt)}
                badgeTone={soon ? 'live' : 'neutral'}
                meta={`Ep ${s.episode}${e ? (e.progress > 0 ? ` · llevas ${e.progress}` : ' · sin empezar') : ''}`}
                onSelect={() => setModal({ media: s.media, entry: e })}
              />
            );
          })}
        </PosterRow>

        {topRated.length > 0 && (
          <PosterRow title="Tus 10 mejores" note="según tu nota" seeAllHref="/lista?status=COMPLETED">
            {topRated.map((e, i) => (
              <PosterTile
                key={e.mediaId}
                className="w-[52vw] max-w-[228px] sm:w-[228px]"
                rank={i + 1}
                title={titleOf(e.media)}
                coverUrl={coverOf(e.media)}
                tint={e.media.coverImage.color}
                score={e.score}
                onSelect={() => setModal({ media: e.media, entry: e })}
              />
            ))}
          </PosterRow>
        )}

        <PosterRow
          title="Pendientes"
          note={planning.length > 0 ? `${planning.length} series` : undefined}
          seeAllHref="/lista?status=PLANNING"
          isEmpty={planning.length === 0}
          emptyState={<EmptyRow text="Tu lista de pendientes está vacía." href="/buscador" cta="Añadir series" />}
        >
          {planning.slice(0, 20).map((e) => (
            <PosterTile
              key={e.mediaId}
              className={TILE}
              title={titleOf(e.media)}
              coverUrl={coverOf(e.media)}
              tint={e.media.coverImage.color}
              meta={[e.media.seasonYear, e.media.episodes ? `${e.media.episodes} ep` : null].filter(Boolean).join(' · ')}
              score={e.media.averageScore ? e.media.averageScore / 10 : null}
              onSelect={() => setModal({ media: e.media, entry: e })}
            />
          ))}
        </PosterRow>
      </div>

      <AnimeDetailModal
        media={modal?.media ?? null}
        entry={modal?.entry ?? null}
        onClose={() => setModal(null)}
        onSaveProgress={saveFromModal}
      />
    </>
  );
}
