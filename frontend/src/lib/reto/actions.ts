'use server';

import { getVerifiedAniListId } from '@/lib/session-server';
import { resolvePlayer } from './guest';
import {
  answerOptionRound,
  answerScorePair,
  getOrCreateChallenge,
  grantLeaguePoints,
  loadPlay,
  ranking,
  settle,
  startRound,
  stateOf,
  todayUTC,
  type RetoPlayer,
} from './server';
import type { RetoRankingRow, RetoState, RoundResult } from './types';

type Res<T> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(fn: () => Promise<T>): Promise<Res<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error('[reto]', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Error del reto.' };
  }
}

/** Sin partida vigente (p. ej. ha cambiado el día): se muestra el reto nuevo. */
async function freshState(): Promise<RetoState> {
  const day = todayUTC();
  return stateOf(day, await getOrCreateChallenge(day), null, (await getVerifiedAniListId()) ? 'account' : 'guest');
}

async function withPlayer<T>(fn: (player: RetoPlayer) => Promise<T>, none: (state: RetoState) => T): Promise<Res<T>> {
  return attempt(async () => {
    const player = await resolvePlayer();
    return player ? fn(player) : none(await freshState());
  });
}

export async function getRetoStateAction(): Promise<Res<RetoState>> {
  return withPlayer(
    async (player) => {
      const day = todayUTC();
      const rounds = await getOrCreateChallenge(day);
      let play = await loadPlay(player, day);
      if (play) play = await grantLeaguePoints(await settle(play, rounds));
      return stateOf(day, rounds, play, player.kind);
    },
    (state) => state
  );
}

export async function startRetoRoundAction(index: number): Promise<Res<RetoState>> {
  const round = Math.trunc(index);
  return attempt(async () => {
    // Solo al empezar de verdad se crea la cookie de invitado
    const player = await resolvePlayer({ create: round === 0 });
    return player ? startRound(player, round) : freshState();
  });
}

export async function answerRetoRoundAction(index: number, pick: number | null): Promise<Res<{ result: RoundResult | null; state: RetoState }>> {
  return withPlayer(
    (player) => answerOptionRound(player, Math.trunc(index), typeof pick === 'number' ? Math.trunc(pick) : null),
    (state) => ({ result: null, state })
  );
}

export async function answerRetoPairAction(index: number, pairIndex: number, pick: 'a' | 'b' | null): Promise<Res<RetoState>> {
  return withPlayer(
    (player) => answerScorePair(player, Math.trunc(index), Math.trunc(pairIndex), pick === 'a' || pick === 'b' ? pick : null),
    (state) => state
  );
}

export async function getRetoRankingAction(scope: 'day' | 'month'): Promise<Res<RetoRankingRow[]>> {
  const me = await getVerifiedAniListId();
  // Los nombres de la clasificación solo se muestran a quien tiene sesión
  if (!me) return { ok: true, data: [] };
  try {
    return { ok: true, data: await ranking(scope === 'month' ? 'month' : 'day', me) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error del ranking.' };
  }
}
