'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Play, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimeFrame } from '@/components/frames/AnimeFrame';
import { PrizeGallery } from './PrizeGallery';
import { FRAME_STYLES, resolveDisplayFrame, resolveUnifiedUserLevel } from '@/lib/league';
import type { MonthlyPrizeRow, UserProfileRow } from '@/types/database';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const nf = new Intl.NumberFormat('es-ES');

export interface ArenaStageProps {
  /** Jugadores ordenados por puntos del mes (desc) */
  monthly: UserProfileRow[];
  currentUserId: number;
  activePrize: MonthlyPrizeRow | null;
  onPlay: () => void;
}

/** Cuenta atrás en vivo hasta una fecha. */
function useCountdown(target: () => Date): { d: number; h: number; m: number; s: number } {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ms = now === null ? 0 : Math.max(0, target().getTime() - now);
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor(ms / 3_600_000) % 24,
    m: Math.floor(ms / 60_000) % 60,
    s: Math.floor(ms / 1000) % 60,
  };
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Próximas 00:00 UTC: el quiz diario cambia entonces (lo elige el servidor por día UTC). */
const nextLocalMidnight = (): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1));
};
/** Día 1 del mes siguiente a las 00:00 UTC: el cron cierra la liga entonces. */
const nextMonthCloseUTC = (): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1));
};

function nameOf(u: UserProfileRow): string {
  return u.username ?? `Usuario #${u.anilist_id}`;
}

/**
 * Escenario del torneo mensual: foco de luz, cuentas atrás, rival directo,
 * botón de jugar y podio 3D con los tres primeros del mes.
 */
export function ArenaStage({ monthly, currentUserId, activePrize, onPlay }: ArenaStageProps): React.JSX.Element {
  const quiz = useCountdown(nextLocalMidnight);
  const league = useCountdown(nextMonthCloseUTC);
  const monthName = MONTHS[new Date().getMonth()] ?? '';

  // En el podio solo entra quien ya ha sumado puntos este mes
  const podium = monthly.filter((u) => (u.monthly_quiz_points || 0) > 0).slice(0, 3);
  const meIdx = monthly.findIndex((u) => u.anilist_id === currentUserId);
  const me = meIdx >= 0 ? monthly[meIdx] : undefined;

  const rival = useMemo(() => {
    const leaderPts = monthly[0]?.monthly_quiz_points || 0;
    if (!me) return { text: 'Juega el quiz de hoy para entrar en la liga del mes.', progress: 0 };
    const mine = me.monthly_quiz_points || 0;
    if (leaderPts === 0) {
      return { text: 'La liga acaba de empezar y nadie ha puntuado: el primer acierto de hoy te pone en cabeza.', progress: 0 };
    }
    // Primer jugador con más puntos que tú (los empatados contigo no cuentan como rival)
    const ahead = [...monthly].reverse().find((u) => (u.monthly_quiz_points || 0) > mine);
    if (!ahead) {
      const chaser = monthly.find((u) => u.anilist_id !== me.anilist_id);
      const gap = mine - (chaser?.monthly_quiz_points || 0);
      return {
        text: chaser
          ? gap > 0
            ? `Lideras con ${nf.format(gap)} PL de ventaja sobre ${nameOf(chaser)}. Defiende el puesto.`
            : `Empatado en cabeza con ${nameOf(chaser)}: un acierto más y es tuyo.`
          : 'Vas primero. Nadie te sigue todavía.',
        progress: 100,
      };
    }
    const theirs = ahead.monthly_quiz_points || 0;
    const aheadPlace = monthly.findIndex((u) => u.anilist_id === ahead.anilist_id) + 1;
    return {
      text: `Estás a ${nf.format(theirs - mine + 1)} PL de adelantar a ${nameOf(ahead)} (${aheadPlace}.º).`,
      progress: theirs > 0 ? Math.min(100, (mine / theirs) * 100) : 0,
    };
  }, [me, monthly]);

  // Orden visual del podio: 2.º · 1.º · 3.º
  const slots: Array<{ place: 1 | 2 | 3; user: UserProfileRow | undefined }> = [
    { place: 2, user: podium[1] },
    { place: 1, user: podium[0] },
    { place: 3, user: podium[2] },
  ];

  return (
    <section aria-label={`Liga de ${monthName}`} className="arena-stage relative isolate overflow-hidden rounded-[22px] bg-[#07080c]">
      {/* Foco de luz y polvo en suspensión */}
      <div aria-hidden="true" className="arena-spotlight pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="arena-dust pointer-events-none absolute inset-0 -z-10" />

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-end lg:gap-10 lg:p-10">
        {/* Columna izquierda: el torneo y la llamada a jugar */}
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Liga de {monthName}
          </h1>
          <p className="mt-3 max-w-md text-base text-white/70">
            El quiz diario y el reto diario suman puntos de liga. El día 1, quien esté arriba se lleva la corona y el premio.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-[14px] bg-white/[0.05] p-4">
              <dt className="flex items-center gap-1.5 text-xs text-white/60">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                Quiz de hoy se renueva en
              </dt>
              <dd className="mt-1 whitespace-nowrap font-display text-xl font-bold text-white tabular sm:text-2xl" aria-live="off">
                {pad(quiz.h)}:{pad(quiz.m)}:{pad(quiz.s)}
              </dd>
            </div>
            <div className="rounded-[14px] bg-white/[0.05] p-4">
              <dt className="flex items-center gap-1.5 text-xs text-white/60">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                La liga cierra en
              </dt>
              <dd className="mt-1 whitespace-nowrap font-display text-xl font-bold text-white tabular sm:text-2xl" aria-live="off">
                {league.d}d {pad(league.h)}h {pad(league.m)}m
              </dd>
            </div>
          </dl>

          {/* Rival directo */}
          <div className="mt-5">
            <p className="text-sm text-white">{rival.text}</p>
            {me && rival.progress > 0 && rival.progress < 100 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Distancia con el rival" aria-valuenow={Math.round(rival.progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-kurama" style={{ width: `${rival.progress}%` }} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onPlay}
            className="arena-cta mt-7 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-[14px] bg-kurama px-8 font-display text-lg font-bold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            Jugar quiz diario
          </button>
        </div>

        {/* Columna derecha: podio 3D */}
        <div className="arena-podium" aria-label="Podio del mes">
          <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {slots.map(({ place, user }) => {
              const lvl = user ? resolveUnifiedUserLevel({ supabaseAnimePoints: user.anime_points, supabaseStoredLevel: user.level }) : null;
              const frame = user && lvl ? resolveDisplayFrame(lvl.computedLevel, user.selected_frame) : 'none';
              const isMe = user?.anilist_id === currentUserId;
              return (
                <li key={place} className={cn('arena-slot flex flex-col items-center', `arena-slot--${place}`)} style={{ order: place === 1 ? 2 : place === 2 ? 1 : 3 }}>
                  {/* Jugador sobre el escalón */}
                  <div className="arena-player relative flex flex-col items-center pb-3 text-center">
                    {place === 1 && <Crown className="arena-crown mb-1 h-7 w-7 text-[#e3b341]" aria-hidden="true" />}
                    {user ? (
                      <AnimeFrame
                        frame={frame}
                        size={place === 1 ? 76 : 60}
                        detail="full"
                        label={FRAME_STYLES[frame].label}
                        showcase={{ title: nameOf(user), subtitle: `${place}.º de la liga · ${nf.format(user.monthly_quiz_points || 0)} PL` }}
                      >
                        <span className="grid h-full w-full place-items-center bg-[#252a36] font-display text-base font-bold text-white">
                          {nameOf(user).slice(0, 2).toUpperCase()}
                        </span>
                      </AnimeFrame>
                    ) : (
                      <div className="grid h-[60px] w-[60px] place-items-center rounded-[14px] border border-dashed border-white/20 text-xs text-white/50">
                        ?
                      </div>
                    )}
                    <p className={cn('mt-5 max-w-[9rem] truncate text-sm font-semibold', isMe ? 'text-kurama' : 'text-white')}>
                      {user ? nameOf(user) : 'Plaza libre'}
                    </p>
                    <p className="text-xs text-white/60 tabular">{user ? `${nf.format(user.monthly_quiz_points || 0)} PL` : '—'}</p>
                  </div>

                  {/* Escalón 3D */}
                  <div className="arena-step-scene w-full">
                    <div className={cn('arena-step', `arena-step--${place}`)}>
                      <span className="arena-step__top" />
                      <span className="arena-step__front">
                        <span className="font-display font-bold tabular">{place}</span>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Premio del mes en vitrina */}
      {activePrize && (
        <div className="border-t border-white/[0.06] p-6 sm:p-8 lg:px-10">
          <div className="arena-prize flex flex-col items-center gap-5 sm:flex-row">
            <PrizeGallery images={activePrize.images ?? []} title={activePrize.title} />
            <div className="min-w-0 text-center sm:text-left">
              <h2 className="font-display text-2xl font-bold text-white">{activePrize.title}</h2>
              <p className="mt-1 text-sm font-medium text-[#e3b341]">Para quien acabe 1.º en la liga de {monthName}</p>
              {activePrize.description && <p className="mt-2 max-w-2xl text-sm text-white/65">{activePrize.description}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
