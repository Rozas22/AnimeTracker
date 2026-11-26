'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, Crown, Eye, Lightbulb, Loader2, Play, Star, UserRound, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  answerRetoPairAction,
  answerRetoRoundAction,
  getRetoStateAction,
  startRetoRoundAction,
} from '@/lib/reto/actions';
import {
  HINT_STEP_SECONDS,
  MAX_SCORE,
  PIXEL_STEPS,
  PODIUM_BONUS,
  PIXEL_STEP_SECONDS,
  type PublicRound,
  type RetoOption,
  type RetoState,
  type RoundResult,
} from '@/lib/reto/types';
import { trackRetoMetricAction } from '@/lib/metrics/actions';
import { squareOf } from '@/lib/reto/share';
import { RetoRanking } from './RetoRanking';
import { ShareResult } from './ShareResult';

const nf = new Intl.NumberFormat('es-ES');

/** Vive mientras dura la carga de la página, aunque el juego se vuelva a montar. */
let visitCounted = false;

const ROUND_ICON: Record<PublicRound['type'], React.ComponentType<{ className?: string }>> = {
  cover: Eye,
  hints: Lightbulb,
  character: UserRound,
  score: Star,
};

const ROUND_HELP: Record<PublicRound['type'], string> = {
  cover: 'La portada se va aclarando. Cuanto antes aciertes, más puntos.',
  hints: 'Cada pocos segundos aparece una pista nueva.',
  character: '¿De qué anime es este personaje? Tienes poco tiempo.',
  score: 'Elige el anime con mejor nota media en AniList. 5 parejas.',
};

/* ------------------------------------------------------------------ */

export function RetoGame({ initial, initialError, notice, arrival = 'direct' }: { initial: RetoState | null; initialError?: string | null; notice?: string | null; arrival?: 'direct' | 'shared' }): React.JSX.Element {
  const [state, setState] = useState<RetoState | null>(initial);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [busy, setBusy] = useState(false);
  const [rankingKey, setRankingKey] = useState(0);

  const apply = useCallback((res: { ok: true; data: RetoState } | { ok: false; error: string }) => {
    if (res.ok) {
      setState(res.data);
      setError(null);
    } else setError(res.error);
  }, []);

  const start = useCallback(
    async (index: number) => {
      setBusy(true);
      apply(await startRetoRoundAction(index));
      setBusy(false);
    },
    [apply]
  );

  const refresh = useCallback(async () => apply(await getRetoStateAction()), [apply]);

  // Visita agregada, sin guardar nada en el dispositivo. Una por carga de página:
  // al empezar como invitado el servidor refresca la ruta y el juego se vuelve a montar.
  useEffect(() => {
    if (visitCounted) return;
    visitCounted = true;
    void trackRetoMetricAction('visit', arrival);
  }, [arrival]);

  const play = state?.play ?? null;
  const finished = Boolean(play?.finished);

  useEffect(() => {
    if (finished) setRankingKey((k) => k + 1);
  }, [finished]);

  if (!state) {
    return (
      <Shell viewer="guest">
        <div className="rounded-[18px] bg-card p-8 text-center" style={{ boxShadow: 'var(--shadow-tile)' }}>
          <p className="text-white">{error ?? 'No se pudo cargar el reto de hoy.'}</p>
          <button type="button" onClick={() => void refresh()} className="mt-4 h-11 rounded-[12px] bg-kurama px-6 font-semibold text-ink">
            Reintentar
          </button>
        </div>
      </Shell>
    );
  }

  const total = state.rounds.length;
  const results = play?.results ?? [];

  return (
    <Shell viewer={state.viewer} number={state.number}>
      {notice && !play?.current && <p className="rounded-[12px] border border-kurama/25 bg-kurama/[0.08] px-4 py-3 text-sm font-medium text-white">{notice}</p>}
      {/* Cabecera: progreso y puntos */}
      <div className="flex items-center justify-between gap-4">
        <ol className="flex gap-1.5" aria-label="Rondas">
          {state.rounds.map((r, i) => {
            const res = results[i];
            const active = play?.current?.index === i;
            return (
              <li
                key={i}
                title={r.label}
                className={cn(
                  'h-2 w-8 rounded-full sm:w-12',
                  res ? (res.points >= 150 ? 'bg-kurama' : res.points > 0 ? 'bg-[#e3b341]' : 'bg-[#e04a66]') : active ? 'bg-white' : 'bg-white/15'
                )}
              />
            );
          })}
        </ol>
        <p className="font-display text-lg font-bold text-white tabular">
          {nf.format(play?.score ?? 0)} <span className="text-sm font-medium text-muted-foreground">/ {nf.format(MAX_SCORE)}</span>
        </p>
      </div>

      {error && <p role="alert" className="rounded-[12px] bg-[#e04a66]/15 px-4 py-3 text-sm text-[#ff8da1]">{error}</p>}

      {!play && <Intro rounds={state.rounds} viewer={state.viewer} busy={busy} onStart={() => void start(0)} />}

      {play && play.current && (
        <RoundView
          key={`${state.day}-${play.current.index}`}
          state={state}
          onState={setState}
          onError={setError}
          onRefresh={refresh}
        />
      )}

      {play && !play.current && !finished && results.length > 0 && (
        <Between
          round={state.rounds[results.length - 1]!}
          index={results.length - 1}
          result={results[results.length - 1]!}
          next={state.rounds[results.length]!}
          busy={busy}
          onNext={() => void start(results.length)}
        />
      )}

      {play && !play.current && !finished && results.length === 0 && (
        <Intro rounds={state.rounds} viewer={state.viewer} busy={busy} onStart={() => void start(0)} />
      )}

      {finished && play && <Summary state={state} />}

      {state.viewer === 'account' && (finished || !play) && <RetoRanking key={rankingKey} />}
    </Shell>
  );
}

function Shell({ children, viewer, number }: { children: React.ReactNode; viewer: RetoState['viewer']; number?: number }): React.JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        {viewer === 'account' && (
          <Link href="/arena" aria-label="Volver a la Arena" className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Reto diario{number ? <span className="text-kurama"> #{number}</span> : null}</h1>
          <p className="text-sm text-muted-foreground">5 rondas · una partida al día · el mismo reto para todos</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Intro({ rounds, viewer, busy, onStart }: { rounds: PublicRound[]; viewer: RetoState['viewer']; busy: boolean; onStart: () => void }): React.JSX.Element {
  return (
    <section className="rounded-[22px] bg-card p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-tile)' }}>
      <h2 className="font-display text-xl font-bold text-white">Hoy te esperan 5 rondas</h2>
      <ol className="mt-5 space-y-3">
        {rounds.map((r, i) => {
          const Icon = ROUND_ICON[r.type];
          return (
            <li key={i} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/[0.06] text-kurama">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-white">{i + 1}. {r.label}</p>
                <p className="text-sm text-muted-foreground">{ROUND_HELP[r.type]} · {r.limit} s</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 rounded-[12px] bg-white/[0.04] px-4 py-3 text-sm text-white/80">
        <Zap className="mr-1.5 inline h-4 w-4 text-kurama" aria-hidden="true" />
        Hasta 200 puntos por ronda: 100 por acertar y hasta 100 más por rapidez. <b className="text-white">Solo tienes un intento</b>: si sales a mitad, el reloj sigue corriendo.
      </p>
      {viewer === 'account' ? <LeagueBox /> : <GuestBox />}
      <button type="button" onClick={onStart} disabled={busy} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-[14px] bg-kurama font-display text-lg font-bold text-ink transition-transform active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-10">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
        Empezar el reto
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function useRoundClock(elapsedMs: number, limitS: number): { ms: number; left: number; over: boolean } {
  const startRef = useRef(Date.now() - elapsedMs);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);
  const ms = now - startRef.current;
  const left = Math.max(0, limitS - ms / 1000);
  return { ms, left, over: left <= 0 };
}

function TimerBar({ left, limit }: { left: number; limit: number }): React.JSX.Element {
  const pct = (left / limit) * 100;
  return (
    <div className="flex items-center gap-3">
      <Clock className={cn('h-4 w-4', left < 5 ? 'text-[#ff6b81]' : 'text-muted-foreground')} aria-hidden="true" />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="timer" aria-label={`${Math.ceil(left)} segundos`}>
        <div className={cn('h-full rounded-full transition-[width] duration-200 ease-linear', left < 5 ? 'bg-[#e04a66]' : 'bg-kurama')} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-display text-sm font-bold text-white tabular">{Math.ceil(left)}</span>
    </div>
  );
}

function RoundView({
  state,
  onState,
  onError,
  onRefresh,
}: {
  state: RetoState;
  onState: (s: RetoState) => void;
  onError: (e: string | null) => void;
  onRefresh: () => Promise<void>;
}): React.JSX.Element {
  const cur = state.play!.current!;
  const round = state.rounds[cur.index]!;
  const { ms, left, over } = useRoundClock(cur.elapsedMs, round.limit);
  const [sending, setSending] = useState(false);
  const sentTimeout = useRef(false);
  const Icon = ROUND_ICON[round.type];
  const sectionRef = useRef<HTMLElement>(null);

  // Al empezar la ronda, que se vea entera (cabecera y reloj incluidos)
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  const answer = useCallback(
    async (pick: number | null) => {
      if (sending) return;
      setSending(true);
      const res = await answerRetoRoundAction(cur.index, pick);
      if (res.ok) onState(res.data.state);
      else onError(res.error);
      setSending(false);
    },
    [cur.index, onError, onState, sending]
  );

  // Se acabó el tiempo
  useEffect(() => {
    if (!over || sentTimeout.current) return;
    sentTimeout.current = true;
    if (round.type === 'score') {
      window.setTimeout(() => void onRefresh(), 1700);
    } else {
      void answer(null);
    }
  }, [over, round.type, answer, onRefresh]);

  // Pistas: pedir la siguiente cuando toque (las libera el servidor)
  const hintAsked = useRef(cur.hints.length);
  useEffect(() => {
    if (round.type !== 'hints') return;
    const due = Math.min(4, 1 + Math.floor(ms / 1000 / HINT_STEP_SECONDS));
    if (due > hintAsked.current && !over) {
      hintAsked.current = due;
      void onRefresh();
    }
  }, [ms, round.type, over, onRefresh]);

  return (
    <section ref={sectionRef} className="scroll-mt-24 rounded-[22px] bg-card p-5 sm:p-7" style={{ boxShadow: 'var(--shadow-tile)' }} aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-semibold text-kurama">
        <Icon className="h-4 w-4" aria-hidden="true" />
        Ronda {cur.index + 1} · {round.label}
      </div>
      <div className="mt-3">
        <TimerBar left={left} limit={round.limit} />
      </div>

      {round.type === 'score' ? (
        <ScorePairs state={state} index={cur.index} disabled={over} onState={onState} onError={onError} />
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-start">
          {/* Visual de la ronda */}
          {round.type === 'cover' && <PixelCover index={cur.index} ms={ms} />}
          {round.type === 'character' && (
            <div className="mx-auto aspect-[2/3] w-44 overflow-hidden rounded-[14px] bg-black/40 sm:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/reto/imagen?r=${cur.index}`} alt="Personaje misterioso" className="h-full w-full object-cover" />
            </div>
          )}
          {round.type === 'hints' && (
            <ol className="space-y-2 sm:col-span-1">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className={cn('rounded-[12px] px-4 py-3 text-sm', cur.hints[i] ? 'bg-white/[0.06] text-white' : 'border border-dashed border-white/10 text-muted-foreground')}>
                  {cur.hints[i] ?? `Pista ${i + 1} en ${Math.max(0, i * HINT_STEP_SECONDS - Math.floor(ms / 1000))} s`}
                </li>
              ))}
            </ol>
          )}

          <Options options={round.options ?? []} disabled={sending || over} onPick={(id) => void answer(id)} />
        </div>
      )}
    </section>
  );
}

function PixelCover({ index, ms }: { index: number; ms: number }): React.JSX.Element {
  const step = Math.min(PIXEL_STEPS.length - 1, Math.floor(ms / 1000 / PIXEL_STEP_SECONDS));
  return (
    <div className="mx-auto aspect-[2/3] w-44 overflow-hidden rounded-[14px] bg-black/40 sm:w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/reto/imagen?r=${index}&s=${step}`}
        alt="Portada pixelada"
        className="h-full w-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

function Options({ options, disabled, onPick }: { options: RetoOption[]; disabled: boolean; onPick: (id: number) => void }): React.JSX.Element {
  return (
    <div className="grid gap-2.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(o.id)}
          className="min-h-[56px] rounded-[14px] bg-white/[0.06] px-4 py-3 text-left transition-colors hover:bg-white/[0.11] active:scale-[0.99] disabled:opacity-50"
        >
          <span className="block font-semibold text-white">{o.title}</span>
          {o.alt && <span className="block text-xs text-muted-foreground">{o.alt}</span>}
        </button>
      ))}
    </div>
  );
}

function ScorePairs({
  state,
  index,
  disabled,
  onState,
  onError,
}: {
  state: RetoState;
  index: number;
  disabled: boolean;
  onState: (s: RetoState) => void;
  onError: (e: string | null) => void;
}): React.JSX.Element {
  const cur = state.play!.current!;
  const pairs = state.rounds[index]!.pairs ?? [];
  const [flash, setFlash] = useState<NonNullable<RoundResult['pairs']>[number] | null>(null);
  const [sending, setSending] = useState(false);
  const pairIndex = cur.pairIndex;
  const pair = pairs[Math.min(pairIndex, pairs.length - 1)];

  const pick = async (side: 'a' | 'b'): Promise<void> => {
    if (sending || flash || disabled) return;
    setSending(true);
    const res = await answerRetoPairAction(index, pairIndex, side);
    setSending(false);
    if (!res.ok) return onError(res.error);
    const pr = res.data.play?.current?.pairResults?.[pairIndex] ?? res.data.play?.results[index]?.pairs?.[pairIndex] ?? null;
    setFlash(pr);
    window.setTimeout(() => {
      setFlash(null);
      onState(res.data);
    }, 1100);
  };

  if (!pair) return <div className="mt-5 text-sm text-muted-foreground">Calculando…</div>;
  const shown = flash ? pairs[pairIndex]! : pair;

  return (
    <div className="mt-5">
      <p className="text-center text-sm text-muted-foreground">
        Pareja {Math.min(pairIndex + 1, pairs.length)} de {pairs.length} · ¿cuál tiene más nota en AniList?
      </p>
      <div className="mx-auto mt-4 grid max-w-[480px] grid-cols-2 gap-3 sm:gap-5">
        {(['a', 'b'] as const).map((side, k) => {
          const m = shown[side];
          const isPicked = flash?.picked === side;
          const won = flash ? (flash.correct ? isPicked : !isPicked) : false;
          return (
            <button
              key={side}
              type="button"
              disabled={disabled || sending || Boolean(flash)}
              onClick={() => void pick(side)}
              className={cn(
                'group relative overflow-hidden rounded-[16px] bg-black/30 text-left ring-2 transition',
                flash ? (won ? 'ring-kurama' : 'ring-transparent opacity-60') : 'ring-transparent hover:ring-white/30'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.cover} alt="" className="aspect-[2/3] w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-10">
                <span className="line-clamp-2 text-sm font-semibold text-white">{m.title}</span>
                {flash && (
                  <span className={cn('mt-1 block font-display text-2xl font-bold tabular', won ? 'text-kurama' : 'text-white/70')}>
                    {flash.scores[k]}%
                  </span>
                )}
              </span>
              {flash && isPicked && (
                <span className={cn('absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full', flash.correct ? 'bg-kurama text-ink' : 'bg-[#e04a66] text-white')}>
                  {flash.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Between({
  round,
  index,
  result,
  next,
  busy,
  onNext,
}: {
  round: PublicRound;
  index: number;
  result: RoundResult;
  next: PublicRound;
  busy: boolean;
  onNext: () => void;
}): React.JSX.Element {
  const NextIcon = ROUND_ICON[next.type];
  return (
    <section className="rounded-[22px] bg-card p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-tile)' }} aria-live="polite">
      <RoundReveal round={round} index={index} result={result} />
      <div className="mt-6 border-t border-white/[0.06] pt-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <NextIcon className="h-4 w-4 text-kurama" aria-hidden="true" />
          Siguiente: <b className="text-white">{next.label}</b> · {next.limit} s
        </p>
        <button type="button" onClick={onNext} disabled={busy} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-kurama font-display text-base font-bold text-ink transition-transform active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:px-10">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
          Siguiente ronda
        </button>
      </div>
    </section>
  );
}

function RoundReveal({ round, index, result }: { round: PublicRound; index: number; result: RoundResult }): React.JSX.Element {
  const good = result.points > 0;
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {(round.type === 'cover' || round.type === 'character') && (
        <div className="mx-auto aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-[12px] bg-black/40 sm:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/reto/imagen?r=${index}&fin=1`} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 text-center sm:text-left">
        <p className={cn('font-display text-3xl font-bold', good ? 'text-kurama' : 'text-[#ff6b81]')}>
          {round.type === 'score'
            ? `${result.pairs?.filter((p) => p.correct).length ?? 0} de ${result.pairs?.length ?? 5} parejas`
            : result.correct
              ? '¡Correcto!'
              : result.picked === null
                ? 'Se acabó el tiempo'
                : 'Fallaste'}
        </p>
        <p className="mt-1 font-display text-xl font-bold text-white tabular">+{nf.format(result.points)} puntos</p>
        {result.answer && (
          <p className="mt-2 text-sm text-muted-foreground">
            Era <b className="text-white">{result.answer.title}</b>
            {result.character ? ` · el personaje es ${result.character}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Summary({ state }: { state: RetoState }): React.JSX.Element {
  const play = state.play!;

  return (
    <section className="rounded-[22px] bg-card p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-tile)' }}>
      <p className="text-sm font-semibold text-kurama">Reto de hoy completado</p>
      <p className="mt-1 font-display text-5xl font-bold text-white tabular">
        {nf.format(play.score)}
        <span className="text-xl font-medium text-muted-foreground"> / {nf.format(MAX_SCORE)}</span>
      </p>
      {play.official ? (
        <>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-kurama/15 px-4 py-2 text-sm font-semibold text-kurama">
            <Crown className="h-4 w-4" aria-hidden="true" />+{nf.format(play.leaguePoints)} PL sumados a la liga del mes
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Si acabas el día en el top 3 del reto, a la 1:00 recibes además +{PODIUM_BONUS[0]}, +{PODIUM_BONUS[1]} o +{PODIUM_BONUS[2]} PL.
          </p>
        </>
      ) : state.viewer === 'guest' ? (
        <div className="mt-4 rounded-[14px] border border-kurama/25 bg-kurama/[0.07] p-4">
          <p className="font-display text-lg font-bold text-white">Guarda tu resultado</p>
          <p className="mt-1 text-sm text-white/80">
            Entra con AniList para conservar esta partida. No sumará a la liga oficial, pero desde tu próximo reto ya podrás competir por premios.
          </p>
          <a href="/auth/anilist?next=/reto" className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-kurama px-5 font-semibold text-ink sm:w-auto">
            Guardar con AniList
          </a>
        </div>
      ) : (
        <p className="mt-3 rounded-[12px] bg-white/[0.05] px-4 py-3 text-sm text-white/80">
          Partida de invitado guardada en tu cuenta. No suma PL ni entra en el podio; <b className="text-white">tu próximo reto ya compite en la liga</b>.
        </p>
      )}
      <ul className="mt-5 divide-y divide-white/[0.06]">
        {state.rounds.map((r, i) => {
          const res = play.results[i];
          return (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-white">
                {squareOf(res)} {r.label}
                {res?.answer && <span className="text-muted-foreground"> · {res.answer.title}</span>}
              </span>
              <span className="font-semibold text-white tabular">+{res?.points ?? 0}</span>
            </li>
          );
        })}
      </ul>
      <ShareResult state={state} />
      {state.viewer === 'account' && (
        <Link href="/ligas" className="mt-3 inline-flex text-sm font-semibold text-kurama underline underline-offset-2">
          Compite con tus amigos en una liga privada
        </Link>
      )}
    </section>
  );
}

function GuestBox(): React.JSX.Element {
  return (
    <p className="mt-3 rounded-[12px] bg-white/[0.04] px-4 py-3 text-sm text-white/80">
      Juega gratis y sin registrarte. Como invitado no entras en la liga ni optas a premios: para competir solo hace falta entrar con AniList.
    </p>
  );
}

function LeagueBox(): React.JSX.Element {
  return (
    <div className="mt-3 rounded-[12px] border border-[#e3b341]/25 bg-[#e3b341]/[0.07] px-4 py-3 text-sm text-white/85">
      <p className="flex items-center gap-1.5 font-semibold text-[#e3b341]">
        <Crown className="h-4 w-4" aria-hidden="true" />
        Suma a la liga mensual
      </p>
      <p className="mt-1">
        Al terminar sumas <b className="text-white">tu puntuación ÷ 10 en PL</b> (hasta 100). Y el <b className="text-white">top 3 del día</b> gana{' '}
        <b className="text-white">+{PODIUM_BONUS[0]} / +{PODIUM_BONUS[1]} / +{PODIUM_BONUS[2]} PL</b> extra al cerrar el día.
      </p>
    </div>
  );
}
