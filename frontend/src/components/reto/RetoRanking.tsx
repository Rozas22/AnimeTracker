'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRetoRankingAction } from '@/lib/reto/actions';
import { PODIUM_BONUS, type RetoRankingRow } from '@/lib/reto/types';

const nf = new Intl.NumberFormat('es-ES');

/** Clasificación del Reto diario: hoy o suma del mes. */
export function RetoRanking(): React.JSX.Element {
  const [scope, setScope] = useState<'day' | 'month'>('day');
  const [rows, setRows] = useState<RetoRankingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    void getRetoRankingAction(scope).then((res) => {
      if (!alive) return;
      if (res.ok) setRows(res.data);
      else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [scope]);

  return (
    <section className="rounded-[22px] bg-card p-5 sm:p-7" style={{ boxShadow: 'var(--shadow-tile)' }} aria-labelledby="reto-ranking">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reto-ranking" className="font-display text-lg font-bold text-white">Ranking del reto</h2>
        <div role="tablist" className="flex rounded-full bg-white/[0.06] p-1">
          {(
            [
              ['day', 'Hoy'],
              ['month', 'Este mes'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={scope === k}
              onClick={() => setScope(k)}
              className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', scope === k ? 'bg-kurama text-ink' : 'text-muted-foreground hover:text-white')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[#ff8da1]">{error}</p>}
      {!rows && !error && (
        <div className="grid place-items-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {rows && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {scope === 'day' ? 'Nadie ha terminado el reto de hoy todavía. ¡Sé el primero!' : 'Aún no hay partidas este mes.'}
        </p>
      )}
      {rows && rows.length > 0 && (
        <ol className="mt-4 divide-y divide-white/[0.05]">
          {rows.map((r) => (
            <li key={r.anilistId} className={cn('flex items-center gap-3 px-2 py-3', r.isMe && 'rounded-[12px] bg-kurama/10')}>
              <span className={cn('w-7 text-center font-display font-bold tabular', r.place === 1 ? 'text-[#e3b341]' : 'text-muted-foreground')}>
                {r.place === 1 ? <Crown className="mx-auto h-5 w-5" aria-label="1.º" /> : r.place}
              </span>
              <span className={cn('min-w-0 flex-1 truncate font-semibold', r.isMe ? 'text-kurama' : 'text-white')}>
                {r.username}
                {r.isMe && <span className="ml-2 text-xs font-medium text-muted-foreground">tú</span>}
              </span>
              {scope === 'month' && r.plays !== undefined && (
                <span className="hidden text-xs text-muted-foreground sm:inline">{r.plays} {r.plays === 1 ? 'reto' : 'retos'}</span>
              )}
              {scope === 'day' && r.place <= PODIUM_BONUS.length && (
                <span className="rounded-full bg-[#e3b341]/15 px-2 py-0.5 text-xs font-semibold text-[#e3b341]" title="Bonus de liga al cerrar el día">
                  +{PODIUM_BONUS[r.place - 1]} PL
                </span>
              )}
              <span className="font-display font-bold text-white tabular">{nf.format(r.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
