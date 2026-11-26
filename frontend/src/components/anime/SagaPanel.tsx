'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FranchiseEntry } from '@/lib/anilist/franchise';
import type { MediaListStatus } from '@/types/anilist';

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const LIST_LABEL: Record<MediaListStatus, string> = {
  COMPLETED: 'Vista',
  CURRENT: 'Viendo',
  PLANNING: 'Pendiente',
  PAUSED: 'En pausa',
  DROPPED: 'Abandonada',
  REPEATING: 'Repitiendo',
};

/** Quita el nombre de la saga que repiten todas las entradas: "Kimetsu no Yaiba: Yuukaku-hen" → "Yuukaku-hen". */
function shortTitle(title: string, base: string): string {
  if (!base || title === base || !title.startsWith(base)) return title;
  const rest = title.slice(base.length).replace(/^[\s:\-–—]+/, '').trim();
  return rest.length > 0 ? rest : title;
}

/** Se puede marcar como vista entera si ya terminó de emitirse. */
export const canComplete = (e: FranchiseEntry): boolean =>
  (e.releaseStatus === 'FINISHED' || e.releaseStatus === 'CANCELLED') && e.myStatus !== 'COMPLETED';

export interface SagaPanelProps {
  entries: FranchiseEntry[] | null;
  currentId: number;
  busyIds: ReadonlySet<number>;
  onOpen: (mediaId: number) => void;
  onComplete: (entries: FranchiseEntry[]) => Promise<void>;
}

/**
 * Temporadas y películas de la saga en orden de emisión: abrir cualquiera sin
 * salir de la tarjeta, marcarlas como vistas y ver tu nota frente a la de AniList.
 */
export function SagaPanel({ entries, currentId, busyIds, onOpen, onComplete }: SagaPanelProps): React.JSX.Element | null {
  const [confirmAll, setConfirmAll] = useState(false);
  const pending = useMemo(() => (entries ?? []).filter(canComplete), [entries]);

  if (entries === null) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }
  if (entries.length < 2) return null;

  const base = entries[0]?.title ?? '';
  const rated = entries.filter((e) => e.myScore !== null);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.myScore ?? 0), 0) / rated.length : null;
  const anyBusy = busyIds.size > 0;

  return (
    <section className="space-y-3" aria-labelledby={`saga-${currentId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={`saga-${currentId}`} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-kurama" />
          Temporadas y películas
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-kurama" aria-hidden="true" />
            Tu nota
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-full bg-white/70" aria-hidden="true" />
            Media AniList
          </span>
        </div>
      </div>

      {avg !== null && (
        <p className="text-xs text-slate-300">
          Tu media en la saga: <b className="text-white">{fmt(Math.round(avg * 10) / 10)}</b>
        </p>
      )}

      {pending.length >= 2 &&
        (confirmAll ? (
          <div className="rounded-xl border border-kurama/30 bg-kurama/[0.07] p-3 text-sm text-white">
            <p>
              Se marcarán como vistas <b>{pending.length}</b> temporadas y películas ya emitidas, con todos sus episodios.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                disabled={anyBusy}
                onClick={() => {
                  setConfirmAll(false);
                  void onComplete(pending);
                }}
                className="h-10 rounded-lg bg-kurama px-4 text-xs font-bold text-ink disabled:opacity-60"
              >
                Marcar todas
              </button>
              <button type="button" onClick={() => setConfirmAll(false)} className="h-10 rounded-lg bg-white/[0.08] px-4 text-xs font-semibold text-white">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={anyBusy}
            onClick={() => setConfirmAll(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/[0.07] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12] disabled:opacity-60"
          >
            <Check className="h-4 w-4 text-kurama" aria-hidden="true" />
            Me la he visto entera: marcar las {pending.length} como vistas
          </button>
        ))}

      <ol className="space-y-2">
        {entries.map((e, i) => {
          const isCurrent = e.mediaId === currentId;
          const name = i === 0 ? e.title : shortTitle(e.title, base);
          const pct = e.myScore !== null ? (e.myScore / 10) * 100 : 0;
          const avgPct = e.averageScore !== null ? (e.averageScore / 10) * 100 : null;
          const busy = busyIds.has(e.mediaId);
          const statusLabel = e.myStatus ? LIST_LABEL[e.myStatus] : 'Sin añadir';
          const airing = e.releaseStatus === 'RELEASING' ? 'En emisión' : e.releaseStatus === 'NOT_YET_RELEASED' ? 'Próximamente' : null;
          return (
            <li key={e.mediaId} className={cn('rounded-xl px-2.5 py-2.5', isCurrent ? 'bg-kurama/[0.08] ring-1 ring-kurama/30' : 'bg-white/[0.03]')}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="w-4 shrink-0 text-right font-display font-bold text-muted-foreground tabular">{i + 1}</span>
                <span className={cn('min-w-0 flex-1 truncate', isCurrent ? 'font-semibold text-white' : 'text-slate-300')} title={e.title}>
                  {name}
                  {e.year ? <span className="font-normal text-muted-foreground"> · {e.year}</span> : null}
                </span>
                {(e.format === 'MOVIE' || e.kind === 'side') && (
                  <span className="shrink-0 rounded bg-white/[0.07] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    {e.format === 'MOVIE' ? 'Película' : 'Extra'}
                  </span>
                )}
                <span className={cn('shrink-0 font-display font-bold tabular', e.myScore !== null ? 'text-white' : 'text-muted-foreground')}>
                  {e.myScore !== null ? fmt(e.myScore) : '—'}
                </span>
              </div>
              <div
                className="relative mt-1.5 h-2 rounded-full bg-white/[0.06]"
                role="img"
                aria-label={`${e.title}: ${e.myScore !== null ? `tu nota ${fmt(e.myScore)}` : 'sin nota'}${e.averageScore !== null ? `, media de AniList ${fmt(e.averageScore)}` : ''}`}
              >
                {e.myScore !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-kurama" style={{ width: `${pct}%` }} />}
                {avgPct !== null && (
                  <span className="absolute -bottom-1 -top-1 w-0.5 -translate-x-1/2 rounded-full bg-white/70 ring-2 ring-card" style={{ left: `${avgPct}%` }} aria-hidden="true" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', e.myStatus === 'COMPLETED' ? 'bg-kurama/15 text-kurama' : 'bg-white/[0.06] text-muted-foreground')}>
                  {statusLabel}
                  {e.myStatus && e.myStatus !== 'COMPLETED' && e.episodes ? ` · ${e.myProgress ?? 0}/${e.episodes}` : ''}
                </span>
                {airing && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{airing}</span>}
                <span className="ml-auto flex gap-1.5">
                  {canComplete(e) && (
                    <button
                      type="button"
                      disabled={busy || anyBusy}
                      onClick={() => void onComplete([e])}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-kurama/15 px-2.5 text-[11px] font-bold text-kurama transition-colors hover:bg-kurama/25 disabled:opacity-50"
                      aria-label={`Marcar ${name} como vista`}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      Vista
                    </button>
                  )}
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => onOpen(e.mediaId)}
                      className="inline-flex h-8 items-center gap-0.5 rounded-lg bg-white/[0.07] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                      aria-label={`Abrir ${name}`}
                    >
                      Abrir
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
