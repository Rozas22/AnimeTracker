'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFranchiseScoresAction, type FranchiseEntry } from '@/lib/anilist/franchise';

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Quita el nombre de la saga que repiten todas las entradas: "Kimetsu no Yaiba: Yuukaku-hen" → "Yuukaku-hen". */
function shortTitle(title: string, base: string): string {
  if (!base || title === base || !title.startsWith(base)) return title;
  const rest = title.slice(base.length).replace(/^[\s:\-–—]+/, '').trim();
  return rest.length > 0 ? rest : title;
}

/** Tu nota en cada temporada de la saga, comparada con la media de AniList. */
export function SeasonScores({ mediaId }: { mediaId: number }): React.JSX.Element | null {
  const [entries, setEntries] = useState<FranchiseEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    void getFranchiseScoresAction(mediaId)
      .then((rows) => alive && setEntries(rows))
      .catch(() => alive && setEntries([]));
    return () => {
      alive = false;
    };
  }, [mediaId]);

  const rated = useMemo(() => (entries ?? []).filter((e) => e.myScore !== null), [entries]);

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

  const best = rated.reduce<FranchiseEntry | null>((acc, e) => (acc && (acc.myScore ?? 0) >= (e.myScore ?? 0) ? acc : e), null);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.myScore ?? 0), 0) / rated.length : null;

  return (
    <section className="space-y-3" aria-labelledby={`season-scores-${mediaId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={`season-scores-${mediaId}`} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-kurama" />
          Tu nota por temporada
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

      {rated.length > 0 && best && avg !== null && (
        <p className="text-xs text-slate-300">
          Media de la saga: <b className="text-white">{fmt(Math.round(avg * 10) / 10)}</b>
          {rated.length > 1 && rated.filter((e) => e.myScore === best.myScore).length === 1 && (
            <>
              {' '}· Tu favorita: <b className="text-white">{best === entries[0] ? best.title : shortTitle(best.title, base)}</b> ({fmt(best.myScore ?? 0)})
            </>
          )}
        </p>
      )}

      <ol className="space-y-2.5">
        {entries.map((e, i) => {
          const isCurrent = e.mediaId === mediaId;
          const pct = e.myScore !== null ? (e.myScore / 10) * 100 : 0;
          const avgPct = e.averageScore !== null ? (e.averageScore / 10) * 100 : null;
          const empty = e.myStatus === null || e.myStatus === 'PLANNING' ? 'No la has visto' : 'Sin nota';
          return (
            <li key={e.mediaId} className={cn('rounded-xl px-2.5 py-2', isCurrent ? 'bg-kurama/[0.08] ring-1 ring-kurama/30' : 'bg-white/[0.03]')}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="w-4 shrink-0 text-right font-display font-bold text-muted-foreground tabular">{i + 1}</span>
                <span className={cn('min-w-0 flex-1 truncate', isCurrent ? 'text-white' : 'text-slate-300')} title={e.title}>
                  {i === 0 ? e.title : shortTitle(e.title, base)}
                  {e.year ? <span className="text-muted-foreground"> · {e.year}</span> : null}
                </span>
                {e.format === 'MOVIE' && (
                  <span className="shrink-0 rounded bg-white/[0.07] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Película</span>
                )}
                <span className={cn('shrink-0 font-display font-bold tabular', e.myScore !== null ? 'text-white' : 'text-muted-foreground')}>
                  {e.myScore !== null ? fmt(e.myScore) : '—'}
                </span>
              </div>
              <div
                className="relative mt-1.5 h-2.5 rounded-full bg-white/[0.06]"
                role="img"
                aria-label={`${e.title}: ${e.myScore !== null ? `tu nota ${fmt(e.myScore)}` : empty.toLowerCase()}${e.averageScore !== null ? `, media de AniList ${fmt(e.averageScore)}` : ''}`}
                title={`Tu nota: ${e.myScore !== null ? fmt(e.myScore) : empty}${e.averageScore !== null ? ` · Media AniList: ${fmt(e.averageScore)}` : ''}`}
              >
                {e.myScore !== null ? (
                  <div className="absolute inset-y-0 left-0 rounded-full bg-kurama transition-[width] duration-500" style={{ width: `${pct}%` }} />
                ) : (
                  <span className="absolute inset-0 flex items-center pl-2 text-[9px] font-semibold uppercase leading-none tracking-wider text-muted-foreground/80">
                    {empty}
                  </span>
                )}
                {avgPct !== null && (
                  <span
                    className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-white/70 ring-2 ring-card"
                    style={{ left: `${avgPct}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
