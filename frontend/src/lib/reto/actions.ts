'use server';

import { getVerifiedAniListId } from '@/lib/session-server';
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
} from './server';
import type { RetoRankingRow, RetoState, RoundResult } from './types';

type Res<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard<T>(fn: (id: number) => Promise<T>): Promise<Res<T>> {
  const id = await getVerifiedAniListId();
  if (!id) return { ok: false, error: 'Entra con tu cuenta de AniList para jugar.' };
  try {
    return { ok: true, data: await fn(id) };
  } catch (e) {
    console.error('[reto]', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Error del reto.' };
  }
}

export async function getRetoStateAction(): Promise<Res<RetoState>> {
  return guard(async (id) => {
    const day = todayUTC();
    const rounds = await getOrCreateChallenge(day);
    let play = await loadPlay(id, day);
    if (play) play = await grantLeaguePoints(await settle(play, rounds));
    return stateOf(day, rounds, play);
  });
}

export async function startRetoRoundAction(index: number): Promise<Res<RetoState>> {
  return guard((id) => startRound(id, Math.trunc(index)));
}

export async function answerRetoRoundAction(index: number, pick: number | null): Promise<Res<{ result: RoundResult | null; state: RetoState }>> {
  return guard((id) => answerOptionRound(id, Math.trunc(index), typeof pick === 'number' ? Math.trunc(pick) : null));
}

export async function answerRetoPairAction(index: number, pairIndex: number, pick: 'a' | 'b' | null): Promise<Res<RetoState>> {
  return guard((id) => answerScorePair(id, Math.trunc(index), Math.trunc(pairIndex), pick === 'a' || pick === 'b' ? pick : null));
}

export async function getRetoRankingAction(scope: 'day' | 'month'): Promise<Res<RetoRankingRow[]>> {
  const me = await getVerifiedAniListId();
  try {
    return { ok: true, data: await ranking(scope === 'month' ? 'month' : 'day', me) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error del ranking.' };
  }
}
