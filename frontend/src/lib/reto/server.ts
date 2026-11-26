// Solo servidor: lógica del Reto diario con respuestas y tiempos verificados.
import { createAdminClient } from '@/lib/supabase/server';
import { ensureChallenge } from './challenge-store';
import type { FullRound } from './generate';
import { countMetric } from '@/lib/metrics/server';
import { addLeaguePoints } from './league';
import { challengeNumber } from './share';
import {
  HINT_STEP_SECONDS,
  SCORE_PAIRS,
  leaguePointsFor,
  type PublicRound,
  type RetoOption,
  type RetoRankingRow,
  type RetoState,
  type RoundResult,
} from './types';

/** Margen para la latencia de red al comprobar el tiempo límite. */
const GRACE_MS = 1500;

export type RetoPlayer = { kind: 'account'; id: number } | { kind: 'guest'; hash: string };

export interface PlayRow {
  anilist_id?: number;
  guest_hash?: string;
  /** 'guest' = partida de invitado conservada al iniciar sesión */
  source?: 'account' | 'guest';
  day: string;
  score: number;
  results: RoundResult[];
  round_state: { picks?: Array<'a' | 'b' | null> } | null;
  round_started_at: string | null;
  finished_at: string | null;
  league_points?: number | null;
}

/* Las tablas del reto no están en los tipos generados de Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (): any => createAdminClient();

export const todayUTC = (): string => new Date().toISOString().slice(0, 10);

const tableOf = (p: RetoPlayer): string => (p.kind === 'account' ? 'challenge_plays' : 'guest_plays');
const keyOf = (p: RetoPlayer): Record<string, string | number> =>
  p.kind === 'account' ? { anilist_id: p.id } : { guest_hash: p.hash };
const playerOf = (play: PlayRow): RetoPlayer =>
  play.guest_hash ? { kind: 'guest', hash: play.guest_hash } : { kind: 'account', id: play.anilist_id! };

/* ------------------------------------------------------------------ */
/* Reto del día                                                          */
/* ------------------------------------------------------------------ */

export async function getOrCreateChallenge(day = todayUTC()): Promise<FullRound[]> {
  return ensureChallenge(day);
}

export function toPublicRound(r: FullRound, index: number): PublicRound {
  if (r.type === 'score') {
    // Las portadas pasan por el servidor: el navegador no llama a AniList
    const cover = (pair: number, side: 'a' | 'b'): string => `/reto/imagen?r=${index}&p=${pair}&side=${side}`;
    return {
      type: r.type,
      label: r.label,
      limit: r.limit,
      pairs: r.pairs.map(({ a, b }, i) => ({ a: { ...a, cover: cover(i, 'a') }, b: { ...b, cover: cover(i, 'b') } })),
    };
  }
  return { type: r.type, label: r.label, limit: r.limit, options: r.options };
}

/* ------------------------------------------------------------------ */
/* Partidas                                                              */
/* ------------------------------------------------------------------ */

export async function loadPlay(player: RetoPlayer, day = todayUTC()): Promise<PlayRow | null> {
  const { data } = await db().from(tableOf(player)).select('*').match(keyOf(player)).eq('day', day).maybeSingle();
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
  const player = playerOf(play);
  const { data } = await db()
    .from(tableOf(player))
    .update({
      results,
      score,
      round_state: null,
      round_started_at: null,
      finished_at: finished ? new Date().toISOString() : null,
    })
    .match(keyOf(player))
    .eq('day', play.day)
    .eq('round_started_at', play.round_started_at)
    .select('*');
  const saved = (data?.[0] as PlayRow) ?? null;

  if (saved && finished) {
    await countMetric('game_finished', saved.guest_hash || saved.source === 'guest' ? 'guest' : 'account');
    return grantLeaguePoints(saved);
  }
  return saved;
}

/**
 * Suma a la liga mensual los PL de una partida terminada, una sola vez:
 * `league_points` pasa de null al valor con una escritura condicional, y solo
 * quien la gana suma. También recupera partidas terminadas antes de existir esto.
 */
export async function grantLeaguePoints(play: PlayRow): Promise<PlayRow> {
  if (play.guest_hash || play.source === 'guest') return play; // los invitados no compiten
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
  await addLeaguePoints(play.anilist_id!, pl);
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
  return (await commitRound(play, rounds, timeoutResult(r, play))) ?? (await loadPlay(playerOf(play), play.day)) ?? play;
}

export function stateOf(day: string, rounds: FullRound[], play: PlayRow | null, viewer: RetoPlayer['kind']): RetoState {
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
    number: challengeNumber(day),
    viewer,
    rounds: rounds.map(toPublicRound),
    play: play
      ? {
          score: play.score,
          results: play.results,
          finished: Boolean(play.finished_at) || play.results.length >= rounds.length,
          leaguePoints: play.league_points ?? 0,
          official: !play.guest_hash && play.source !== 'guest',
          current,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Acciones de juego                                                     */
/* ------------------------------------------------------------------ */

export async function startRound(player: RetoPlayer, index: number): Promise<RetoState> {
  const day = todayUTC();
  const rounds = await getOrCreateChallenge(day);
  let play = await loadPlay(player, day);

  if (!play) {
    if (index !== 0) return stateOf(day, rounds, null, player.kind);
    const conflict = player.kind === 'account' ? 'anilist_id,day' : 'guest_hash,day';
    const { data: created } = await db()
      .from(tableOf(player))
      .upsert({ ...keyOf(player), day, results: [], score: 0 }, { onConflict: conflict, ignoreDuplicates: true })
      .select('day');
    if (created?.length) await countMetric('game_started', player.kind);
    play = await loadPlay(player, day);
    if (!play) throw new Error('No se pudo crear la partida.');
  }
  play = await settle(play, rounds);

  // Solo se arranca la ronda que toca, y una sola vez (recargar no reinicia el reloj)
  if (index === play.results.length && index < rounds.length && !play.round_started_at) {
    const now = new Date().toISOString();
    await db()
      .from(tableOf(player))
      .update({ round_started_at: now, round_state: rounds[index]!.type === 'score' ? { picks: [] } : null })
      .match(keyOf(player))
      .eq('day', day)
      .is('round_started_at', null);
    play = (await loadPlay(player, day)) ?? play;
  }
  return stateOf(day, rounds, play, player.kind);
}

export async function answerOptionRound(
  player: RetoPlayer,
  index: number,
  pick: number | null
): Promise<{ result: RoundResult | null; state: RetoState }> {
  const day = todayUTC();
  const rounds = await getOrCreateChallenge(day);
  let play = await loadPlay(player, day);
  const r = rounds[index];
  if (!play || !r || r.type === 'score' || index !== play.results.length || !play.round_started_at) {
    return { result: null, state: stateOf(day, rounds, play, player.kind) };
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
  play = (await commitRound(play, rounds, result)) ?? (await loadPlay(player, day));
  return { result: play?.results[index] ?? result, state: stateOf(day, rounds, play, player.kind) };
}

export async function answerScorePair(
  player: RetoPlayer,
  index: number,
  pairIndex: number,
  pick: 'a' | 'b' | null
): Promise<RetoState> {
  const day = todayUTC();
  const rounds = await getOrCreateChallenge(day);
  let play = await loadPlay(player, day);
  const r = rounds[index];
  if (!play || !r || r.type !== 'score' || index !== play.results.length || !play.round_started_at) {
    return stateOf(day, rounds, play, player.kind);
  }
  const picks = [...(play.round_state?.picks ?? [])];
  const expired = elapsedMs(play) > r.limit * 1000 + GRACE_MS;
  if (pairIndex === picks.length && !expired) {
    picks.push(pick === 'a' || pick === 'b' ? pick : null);
    const { data } = await db()
      .from(tableOf(player))
      .update({ round_state: { picks } })
      .match(keyOf(player))
      .eq('day', day)
      .eq('round_started_at', play.round_started_at)
      .select('*');
    play = (data?.[0] as PlayRow) ?? play;
  }
  if (expired || (play.round_state?.picks ?? []).length >= SCORE_PAIRS) {
    play = (await commitRound(play, rounds, timeoutResult(r, play))) ?? (await loadPlay(player, day));
  }
  return stateOf(day, rounds, play, player.kind);
}

/* ------------------------------------------------------------------ */
/* Ranking                                                               */
/* ------------------------------------------------------------------ */

export async function ranking(scope: 'day' | 'month', me: number | null): Promise<RetoRankingRow[]> {
  const day = todayUTC();
  const monthStart = `${day.slice(0, 7)}-01`;
  let q = db().from('challenge_plays').select('anilist_id, score, day, finished_at').eq('source', 'account').not('finished_at', 'is', null).order('finished_at', { ascending: true });
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
    ? await db().from('users').select('anilist_id, username, profile_visibility').in('anilist_id', ids)
    : { data: [] };
  const people = new Map(
    ((users ?? []) as Array<{ anilist_id: number; username: string | null; profile_visibility: string | null }>).map((u) => [u.anilist_id, u])
  );
  // Al navegador solo llega el nombre visible: nunca el id, y nunca el nombre de un perfil no público
  const nameOf = (id: number): string => {
    const u = people.get(id);
    if (!u?.username) return 'Jugador';
    return id === me || (u.profile_visibility ?? 'public') === 'public' ? u.username : 'Anónimo';
  };

  return sorted
    .map(([id, t], i) => ({ username: nameOf(id), score: t.score, plays: t.plays, isMe: id === me, place: i + 1 }))
    .filter((r) => r.place <= 50 || r.isMe);
}
