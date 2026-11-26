'use server';

import { countMetric } from '@/lib/metrics/server';
import { getVerifiedAniListId } from '@/lib/session-server';
import {
  createLeague,
  getLeagueDetail,
  isLeagueId,
  joinLeague,
  kickMember,
  leaveLeague,
  normalizeCode,
  rotateInviteCode,
} from './server';
import type { LeagueDetail, LeagueResult } from './types';

/** Intentos fallidos de código por usuario y hora en cada servidor. */
const MAX_BAD_CODES = 20;
const badCodes = new Map<number, { count: number; resetAt: number }>();

async function withUser<T>(fn: (me: number) => Promise<T>): Promise<LeagueResult<T>> {
  const me = await getVerifiedAniListId();
  if (!me) return { ok: false, error: 'Entra con tu cuenta de AniList para usar las ligas.' };
  try {
    return { ok: true, data: await fn(me) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error en la liga.' };
  }
}

function requireLeague(id: string): void {
  if (!isLeagueId(String(id))) throw new Error('Liga no válida.');
}

async function detailOrFail(me: number, id: string): Promise<LeagueDetail> {
  const detail = await getLeagueDetail(me, id);
  if (!detail) throw new Error('Ya no formas parte de esta liga.');
  return detail;
}

export async function createLeagueAction(name: string): Promise<LeagueResult<string>> {
  return withUser(async (me) => {
    const id = await createLeague(me, name);
    await countMetric('league_created', 'all', me);
    return id;
  });
}

export async function joinLeagueAction(rawCode: string): Promise<LeagueResult<string>> {
  return withUser(async (me) => {
    const now = Date.now();
    if (badCodes.size > 5000) badCodes.clear();
    const entry = badCodes.get(me);
    if (entry && entry.resetAt > now && entry.count >= MAX_BAD_CODES) {
      throw new Error('Demasiados códigos incorrectos. Inténtalo más tarde.');
    }
    const code = normalizeCode(rawCode);
    try {
      if (!code) throw new Error('Ese código de invitación no es válido.');
      const joined = await joinLeague(me, code);
      if (joined.isNew) await countMetric('league_joined', 'all', me);
      return joined.id;
    } catch (e) {
      if (e instanceof Error && e.message.includes('no es válido')) {
        const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + 3_600_000 };
        badCodes.set(me, { ...current, count: current.count + 1 });
      }
      throw e;
    }
  });
}

export async function leaveLeagueAction(id: string): Promise<LeagueResult<true>> {
  return withUser(async (me) => {
    requireLeague(id);
    await leaveLeague(me, id);
    return true as const;
  });
}

export async function kickMemberAction(id: string, memberKey: string): Promise<LeagueResult<LeagueDetail>> {
  return withUser(async (me) => {
    requireLeague(id);
    await kickMember(me, id, String(memberKey));
    return detailOrFail(me, id);
  });
}

export async function rotateInviteCodeAction(id: string): Promise<LeagueResult<LeagueDetail>> {
  return withUser(async (me) => {
    requireLeague(id);
    await rotateInviteCode(me, id);
    return detailOrFail(me, id);
  });
}
