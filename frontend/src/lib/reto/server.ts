// Solo servidor: lógica del Reto diario con respuestas y tiempos verificados.
import { createAdminClient } from '@/lib/supabase/server';
import { buildChallenge, type FullRound } from './generate';
import { addLeaguePoints } from './league';
import {
  HINT_STEP_SECONDS,
  SCORE_PAIRS,
  leaguePointsFor,
  type PublicRound,
  type RetoOption,
  type RetoState,
  type RoundResult,
} from './types';

/** Margen para la latencia de red al comprobar el tiempo límite. */
const GRACE_MS = 1500;

export interface PlayRow {
  anilist_id: number;
  day: string;
  score: number;
  results: RoundResult[];
  round_state: { picks?: Array<'a' | 'b' | null> } | null;
  round_started_at: string | null;
  finished_at: string | null;
  league_points?: number;
}

/* Las tablas del reto no están en los tipos generados de Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (): any => createAdminClient();

export const todayUTC = (): string => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Reto del día                                                          */
/* ------------------------------------------------------------------ */

export async function getOrCreateChallenge(day = todayUTC()): Promise<FullRound[]> {
  const { data, error } = await db().from('daily_challenges').select('rounds').eq('day', day).maybeSingle();
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
    throw new Error('Falta crear las tablas del reto (supabase_migration_reto.sql).');
  }
  if (data?.rounds) return data.rounds as FullRound[];

  const rounds = await buildChallenge(day);
  // Si otro servidor lo creó a la vez, se queda el primero
  await db().from('daily_challenges').upsert({ day, rounds }, { onConflict: 'day', ignoreDuplicates: true });
  const { data: saved } = await db().from('daily_challenges').select('rounds').eq('day', day).maybeSingle();
  return (saved?.rounds as FullRound[]) ?? rounds;
}

export function toPublicRound(r: FullRound): PublicRound {
  if (r.type === 'score') {
    return { type: r.type, label: r.label, limit: r.limit, pairs: r.pairs.map(({ a, b }) => ({ a, b })) };
  }
  return { type: r.type, label: r.label, limit: r.limit, options: r.options };
}

/* ------------------------------------------------------------------ */
/* Partidas                                                              */
/* ------------------------------------------------------------------ */

export async function loadPlay(anilistId: number, day = todayUTC()): Promise<PlayRow | null> {
  const { data } = await db().from('challenge_plays').select('*').eq('anilist_id', anilistId).eq('day', day).maybeSingle();
  return (data as PlayRow) ?? null;
}

const elapsedMs = (play: PlayRow): number =>
  play.round_started_at ? Date.now() - new Date(play.round_started_at).getTime() : 0;

const answerOf = (r: FullRound): RetoOption | null =>
  r.type === 'score' ? null : r.options.find((o) => o.id === r.answerId) ?? null;

/** Puntos de una ronda de opciones: 100 por acertar + hasta 100 por rapidez. */
function optionPoints(correct: boolean, ms: number, limitS: number): number {
  if (!correct || ms > limitS * 1000 + GRACE_MS) return 0;
  return 100 + Math.round(100 * Math.max(0, 1 - ms / (limitS * 1000)));
}

/**
 * Cierra la ronda en curso guardando el resultado. Usa el inicio de ronda como
 * candado: si dos peticiones llegan a la vez, solo una escribe.
 */
async function commitRound(play: PlayRow, rounds: FullRound[], result: RoundResult): Promise<PlayRow | null> {
  const results = [...play.results, result];
  const finished = results.length >= rounds.length;
  const score = results.reduce((a, r) => a + r.points, 0);
  const { data } = await db()
    .from('challenge_plays')
    .update({
      results,
      score,
      round_state: null,
      round_started_at: null,
      finished_at: finished ? new Date().toISOString() : null,
    })
    .eq('anilist_id', play.anilist_id)
    .eq('day', play.day)
    .eq('round_started_at', play.round_started_at)
    .select('*');
  const saved = (data?.[0] as PlayRow) ?? null;

  if (saved && finished) return grantLeaguePoints(saved);
  return saved;
}

/**
 * Suma a la liga mensual los PL de una partida terminada, una sola vez:
 * `league_points` pasa de null al valor con una escritura condicional, y solo
 * quien la gana suma. También recupera partidas terminadas antes de existir esto.
 */
export async function grantLeaguePoints(play: PlayRow): Promise<PlayRow> {
  if (!play.finished_at || (play.league_points !== null && play.league_points !== undefined)) return play;
  const pl = leaguePointsFor(play.score);
  const { data, error } = await db()
    .from('challenge_plays')
    .update({ league_points: pl })
    .eq('anilist_id', play.anilist_id)
    .eq('day', play.day)
    .is('league_points', null)
    .select('*');
  if (error || !data?.[0]) return play; // ya sumado, o falta supabase_migration_reto_liga.sql
  await addLeaguePoints(play.anilist_id, pl);
  return data[0] as PlayRow;
}

function timeoutResult(r: FullRound, play: PlayRow): RoundResult {
  if (r.type === 'score') {
    const picks = play.round_state?.picks ?? [];
    const pairs = r.pairs.map((p, i) => {
      const picked = picks[i] ?? null;
      return { picked, correct: picked === p.answer, scores: p.scores };
    });
    return { correct: pairs.every((p) => p.correct), points: pairs.filter((p) => p.correct).length * 40, pairs };
  }
  return {
    correct: false,
    points: 0,
    answer: answerOf(r),
    picked: null,
    character: r.type === 'character' ? r.name : null,
  };
}

/** Si la ronda en curso ya caducó (p. ej. cerró la pestaña), se cierra con lo que hubiera. */
export async function settle(play: PlayRow, rounds: FullRound[]): Promise<PlayRow> {
  const idx = play.results.length;
  const r = rounds[idx];
  if (!r || !play.round_started_at) return play;
  if (elapsedMs(play) <= r.limit * 1000 + GRACE_MS) return play;
  return (await commitRound(play, rounds, timeoutResult(r, play))) ?? (await loadPlay(play.anilist_id, play.day)) ?? play;
}

export function stateOf(day: string, rounds: FullRound[], play: PlayRow | null): RetoState {
  let current: NonNullable<RetoState['play']>['current'] = null;
  if (play && play.round_started_at && play.results.length < rounds.length) {
    const idx = play.results.length;
    const r = rounds[idx]!;
    const ms = elapsedMs(play);
    const picks = play.round_state?.picks ?? [];
    current = {
      index: idx,
      elapsedMs: ms,
      hints: r.type === 'hints' ? r.hints.slice(0, 1 + Math.floor(ms / 1000 / HINT_STEP_SECONDS)) : [],
      pairIndex: picks.length,
      pairResults:
        r.type === 'score'
          ? picks.map((p, i) => ({ picked: p, correct: p === r.pairs[i]!.answer, scores: r.pairs[i]!.scores }))
          : undefined,
    };
  }
  return {
    day,
    rounds: rounds.map(toPublicRound),
    play: play
      ? {
          score: play.score,
          results: play.results,
          finished: Boolean(play.finished_at) || play.results.length >= rounds.length,
          leaguePoints: play.league_points ?? 0,
          current,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Acciones de juego                                                     */
/* ------------------------------------------------------------------ */

export async function startRound(anilistId: number, index: number): Promise<RetoState> {
  const day = todayUTC();
  const rounds = await getOrCreateChallenge(day);
  let play = await loadPlay(anilistId, day);

  if (!play) {
    if (index !== 0) return stateOf(day, rounds, null);
    await db()
      .from('challenge_plays')
      .upsert({ anilist_id: anilistId, day, results: [], score: 0 }, { onConflict: 'anilist_id,day', ignoreDuplicates: true });
    play = await loadPlay(anilistId, day);
    if (!play) throw new Error('No se pudo crear la partida.');
  }
  play = await settle(play, rounds);

  // Solo se arranca la ronda que toca, y una sola vez (recargar no reinicia el reloj)
  if (index === play.results.length && index < rounds.length && !play.round_started_at) {
    const now = new Date().toISOString();
    await db()
      .from('challenge_plays')
      .update({ round_started_at: now, round_state: rounds[index]!.type === 'score' ? { picks: [] } : null })
      .eq('anilist_id', anilistId)
      .eq('day', day)
      .is('round_started_at', null);
    play = (await loadPlay(anilistId, day)) ?? play;
  }
  return stateOf(day, rounds, play);
}

export async function answerOptionRound(
  anilistId: number,
  index: number,
  pick: number | null
): Promise<{ result: RoundResult | null; state: RetoState }> {
  const day = todayUTC();
  const rounds = await getOrCreateChallenge(day);
  let play = await loadPlay(anilistId, day);
  const r = rounds[index];
  if (!play || !r || r.type === 'score' || index !== play.results.length || !play.round_started_at) {
    return { result: null, state: stateOf(day, rounds, play) };
  }
  const ms = elapsedMs(play);
  const correct = pick === r.answerId;
  const result: RoundResult = {
    correct: correct && ms <= r.limit * 1000 + GRACE_MS,
    points: optionPoints(correct, ms, r.limit),
    answer: answerOf(r),
    picked: pick,
    character: r.type === 'character' ? r.name : null,
  };
  play = (await commitRound(play, rounds, result)) ?? (await loadPlay(anilistId, day));
  return { result: play?.results[index] ?? result, state: stateOf(day, rounds, play) };
}

export async function answerScorePair(
  anilistId: number,
  index: number,
  pairIndex: number,
  pick: 'a' | 'b' | null
): Promise<RetoState> {
  const day = todayUTC();
  const rounds = await getOrCreateChallenge(day);
  let play = await loadPlay(anilistId, day);
  const r = rounds[index];
  if (!play || !r || r.type !== 'score' || index !== play.results.length || !play.round_started_at) {
    return stateOf(day, rounds, play);
  }
  const picks = [...(play.round_state?.picks ?? [])];
  const expired = elapsedMs(play) > r.limit * 1000 + GRACE_MS;
  if (pairIndex === picks.length && !expired) {
    picks.push(pick === 'a' || pick === 'b' ? pick : null);
    const { data } = await db()
      .from('challenge_plays')
      .update({ round_state: { picks } })
      .eq('anilist_id', anilistId)
      .eq('day', day)
      .eq('round_started_at', play.round_started_at)
      .select('*');
    play = (data?.[0] as PlayRow) ?? play;
  }
  if (expired || (play.round_state?.picks ?? []).length >= SCORE_PAIRS) {
    play = (await commitRound(play, rounds, timeoutResult(r, play))) ?? (await loadPlay(anilistId, day));
  }
  return stateOf(day, rounds, play);
}

/* ------------------------------------------------------------------ */
/* Ranking                                                               */
/* ------------------------------------------------------------------ */

export async function ranking(
  scope: 'day' | 'month',
  me: number | null
): Promise<Array<{ anilistId: number; username: string; score: number; plays: number; isMe: boolean; place: number }>> {
  const day = todayUTC();
  const monthStart = `${day.slice(0, 7)}-01`;
  let q = db().from('challenge_plays').select('anilist_id, score, day, finished_at').not('finished_at', 'is', null).order('finished_at', { ascending: true });
  q = scope === 'day' ? q.eq('day', day) : q.gte('day', monthStart);
  const { data } = await q.limit(5000);
  const rows = (data ?? []) as Array<{ anilist_id: number; score: number }>;

  const totals = new Map<number, { score: number; plays: number }>();
  for (const r of rows) {
    const t = totals.get(r.anilist_id) ?? { score: 0, plays: 0 };
    t.score += r.score;
    t.plays += 1;
    totals.set(r.anilist_id, t);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1].score - a[1].score);
  const ids = sorted.slice(0, 50).map(([id]) => id);
  if (me && totals.has(me) && !ids.includes(me)) ids.push(me);

  const { data: users } = ids.length
    ? await db().from('users').select('anilist_id, username').in('anilist_id', ids)
    : { data: [] };
  const names = new Map<number, string>(
    ((users ?? []) as Array<{ anilist_id: number; username: string | null }>).map((u) => [u.anilist_id, u.username ?? `Usuario #${u.anilist_id}`])
  );

  return sorted
    .map(([id, t], i) => ({ anilistId: id, username: names.get(id) ?? `Usuario #${id}`, score: t.score, plays: t.plays, isMe: id === me, place: i + 1 }))
    .filter((r) => r.place <= 50 || r.isMe);
}
