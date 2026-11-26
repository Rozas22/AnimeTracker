// Solo servidor: ligas privadas. No tocan los puntos de la liga oficial.
import { randomInt } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { LEAGUE_LIMITS, type InvitePreview, type LeagueDetail, type LeagueRow, type LeagueSummary } from './types';

/* Las tablas de ligas no están en los tipos generados de Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (): any => createAdminClient();

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isLeagueId = (value: string): boolean => UUID_RE.test(value);

const newCode = (): string => Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

/** Acepta el código con espacios, guiones o en minúsculas. */
export function normalizeCode(raw: string): string | null {
  const code = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '').slice(0, 20);
  return CODE_RE.test(code) ? code : null;
}

export function cleanLeagueName(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const name = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length < LEAGUE_LIMITS.nameMin || name.length > LEAGUE_LIMITS.nameMax) return null;
  if (/https?:|www\.|@|[<>]/i.test(name)) return null;
  return name;
}

const activeCounts = async (ids: string[]): Promise<Map<string, number>> => {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;
  const { data } = await db().from('private_league_members').select('league_id').in('league_id', ids).is('removed_at', null);
  for (const r of (data ?? []) as Array<{ league_id: string }>) counts.set(r.league_id, (counts.get(r.league_id) ?? 0) + 1);
  return counts;
};

export async function listMyLeagues(me: number): Promise<LeagueSummary[]> {
  const { data: mine, error } = await db()
    .from('private_league_members')
    .select('league_id, joined_at')
    .eq('anilist_id', me)
    .is('removed_at', null)
    .order('joined_at', { ascending: true });
  if (error) throw new Error('No se pudieron cargar tus ligas.');
  const ids = ((mine ?? []) as Array<{ league_id: string }>).map((m) => m.league_id);
  if (!ids.length) return [];

  const [{ data: leagues }, counts] = await Promise.all([
    db().from('private_leagues').select('id, name, owner_id').in('id', ids),
    activeCounts(ids),
  ]);
  const byId = new Map(((leagues ?? []) as Array<{ id: string; name: string; owner_id: number }>).map((l) => [l.id, l]));
  return ids.flatMap((id) => {
    const l = byId.get(id);
    return l ? [{ id, name: l.name, isOwner: l.owner_id === me, members: counts.get(id) ?? 1 }] : [];
  });
}

const STATUS_ERRORS: Record<string, string> = {
  max_owned: `Puedes crear hasta ${LEAGUE_LIMITS.owned} ligas.`,
  max_joined: `Puedes estar en hasta ${LEAGUE_LIMITS.joined} ligas.`,
  full: `Esta liga ya tiene ${LEAGUE_LIMITS.members} miembros.`,
  blocked: 'Te han expulsado de esta liga y no puedes volver a entrar.',
  invalid: 'Ese código de invitación no es válido.',
};

export async function createLeague(me: number, rawName: string): Promise<string> {
  const name = cleanLeagueName(rawName);
  if (!name) throw new Error(`El nombre debe tener entre ${LEAGUE_LIMITS.nameMin} y ${LEAGUE_LIMITS.nameMax} caracteres, sin enlaces.`);
  for (let i = 0; i < 4; i++) {
    const { data, error } = await db().rpc('create_private_league', { p_owner: me, p_name: name, p_code: newCode() });
    if (error) throw new Error('No se pudo crear la liga.');
    if (data?.status === 'ok') return data.id as string;
    if (data?.status !== 'code_taken') throw new Error(STATUS_ERRORS[data?.status] ?? 'No se pudo crear la liga.');
  }
  throw new Error('No se pudo crear la liga. Inténtalo de nuevo.');
}

export async function previewInvite(code: string, me: number): Promise<InvitePreview | null> {
  const { data: league } = await db().from('private_leagues').select('id, name').eq('invite_code', code).maybeSingle();
  if (!league) return null;
  const [{ data: member }, counts] = await Promise.all([
    db().from('private_league_members').select('removed_at').eq('league_id', league.id).eq('anilist_id', me).maybeSingle(),
    activeCounts([league.id]),
  ]);
  const members = counts.get(league.id) ?? 0;
  const status: InvitePreview['status'] = member
    ? member.removed_at ? 'blocked' : 'member'
    : members >= LEAGUE_LIMITS.members ? 'full' : 'open';
  return { id: league.id, name: league.name, members, status };
}

export async function joinLeague(me: number, code: string): Promise<{ id: string; isNew: boolean }> {
  const { data, error } = await db().rpc('join_private_league', { p_code: code, p_user: me });
  if (error) throw new Error('No se pudo entrar en la liga.');
  if (data?.status === 'ok' || data?.status === 'already') return { id: data.id as string, isNew: data.status === 'ok' };
  throw new Error(STATUS_ERRORS[data?.status] ?? 'No se pudo entrar en la liga.');
}

export async function leaveLeague(me: number, leagueId: string): Promise<void> {
  const { data, error } = await db().rpc('leave_private_league', { p_league: leagueId, p_user: me });
  if (error || data === 'none') throw new Error('No se pudo salir de la liga.');
}

export async function kickMember(me: number, leagueId: string, memberKey: string): Promise<void> {
  if (!UUID_RE.test(memberKey)) throw new Error('Miembro no válido.');
  const { data, error } = await db().rpc('kick_private_league_member', { p_league: leagueId, p_owner: me, p_member_key: memberKey });
  if (error || data !== 'ok') throw new Error(data === 'forbidden' ? 'Solo quien creó la liga puede expulsar.' : 'No se pudo expulsar a ese miembro.');
}

export async function rotateInviteCode(me: number, leagueId: string): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const { data, error } = await db()
      .from('private_leagues')
      .update({ invite_code: newCode() })
      .eq('id', leagueId)
      .eq('owner_id', me)
      .select('id');
    if (!error) {
      if (data?.length) return;
      throw new Error('Solo quien creó la liga puede cambiar el código.');
    }
    if (error.code !== '23505') break;
  }
  throw new Error('No se pudo cambiar el código.');
}

function periodStarts(now = new Date()): { week: string; month: string } {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return { week: monday.toISOString().slice(0, 10), month: `${now.toISOString().slice(0, 7)}-01` };
}

export async function getLeagueDetail(me: number, leagueId: string): Promise<LeagueDetail | null> {
  if (!UUID_RE.test(leagueId)) return null;
  const [{ data: league }, { data: membersRaw }] = await Promise.all([
    db().from('private_leagues').select('id, name, invite_code, owner_id').eq('id', leagueId).maybeSingle(),
    db()
      .from('private_league_members')
      .select('anilist_id, member_key, joined_at')
      .eq('league_id', leagueId)
      .is('removed_at', null)
      .order('joined_at', { ascending: true })
      .order('anilist_id', { ascending: true }),
  ]);
  const members = (membersRaw ?? []) as Array<{ anilist_id: number; member_key: string }>;
  if (!league || !members.some((m) => m.anilist_id === me)) return null;

  const ids = members.map((m) => m.anilist_id);
  const { week, month } = periodStarts();
  const from = week < month ? week : month;
  const [{ data: users }, { data: playsRaw }] = await Promise.all([
    db().from('users').select('anilist_id, username, profile_visibility').in('anilist_id', ids),
    db()
      .from('challenge_plays')
      .select('anilist_id, day, score')
      .in('anilist_id', ids)
      .gte('day', from)
      .not('finished_at', 'is', null)
      .limit(5000),
  ]);
  const people = new Map(
    ((users ?? []) as Array<{ anilist_id: number; username: string | null; profile_visibility: string | null }>).map((u) => [u.anilist_id, u])
  );
  const plays = (playsRaw ?? []) as Array<{ anilist_id: number; day: string; score: number }>;
  const isOwner = league.owner_id === me;

  const names = new Map<number, string>();
  members.forEach((m, i) => {
    const u = people.get(m.anilist_id);
    const visible = m.anilist_id === me || (u?.profile_visibility ?? 'public') === 'public';
    names.set(m.anilist_id, visible && u?.username ? u.username : `Miembro ${i + 1}`);
  });

  const table = (start: string): LeagueRow[] => {
    const rows = members.map((m, i) => {
      const own = plays.filter((p) => p.anilist_id === m.anilist_id && p.day >= start);
      return {
        key: `m${i}`,
        name: names.get(m.anilist_id)!,
        score: own.reduce((a, p) => a + p.score, 0),
        plays: own.length,
        place: 0,
        isMe: m.anilist_id === me,
        isOwner: m.anilist_id === league.owner_id,
        memberKey: isOwner ? m.member_key : null,
      };
    });
    rows.sort((a, b) => b.score - a.score || b.plays - a.plays);
    let place = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.score !== rows[i - 1]!.score) place = i + 1;
      r.place = place;
    });
    return rows;
  };

  return {
    id: league.id,
    name: league.name,
    code: league.invite_code,
    isOwner,
    members: members.length,
    week: table(week),
    month: table(month),
  };
}
