// Solo servidor: identidad anónima del invitado durante el día de juego.
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { getVerifiedAniListId } from '@/lib/session-server';
import { utcDay } from './challenge-store';
import type { RetoPlayer } from './server';

export const GUEST_COOKIE = 'kurama_guest';

/** Partidas nuevas por conexión y hora en cada servidor: frena la creación masiva. */
const MAX_NEW_GUESTS_PER_HOUR = 30;
const newGuests = new Map<string, { count: number; resetAt: number }>();

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** La cookie es `día.token`: un token nuevo cada día, así no se enlazan días distintos. */
export function parseGuestCookie(value: string | undefined): { day: string; hash: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})\.([A-Za-z0-9_-]{32,64})$/.exec(value ?? '');
  return match ? { day: match[1]!, hash: sha256(match[2]!) } : null;
}

function allowNewGuest(): boolean {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = sha256(ip);
  const now = Date.now();
  if (newGuests.size > 5000) newGuests.clear();
  const entry = newGuests.get(key);
  if (!entry || entry.resetAt <= now) {
    newGuests.set(key, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_NEW_GUESTS_PER_HOUR;
}

function createGuest(day: string): RetoPlayer {
  if (!allowNewGuest()) throw new Error('Demasiadas partidas nuevas desde esta conexión. Inténtalo más tarde.');
  const token = randomBytes(32).toString('base64url');
  // Dura hasta 1 h después de acabar el día, para poder guardar una partida de última hora
  const expires = new Date(`${utcDay(1)}T01:00:00.000Z`);
  cookies().set(GUEST_COOKIE, `${day}.${token}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
  });
  return { kind: 'guest', hash: sha256(token) };
}

/** Quién juega: la cuenta verificada o, si no hay sesión, el invitado de hoy. */
export async function resolvePlayer(options: { create?: boolean } = {}): Promise<RetoPlayer | null> {
  const id = await getVerifiedAniListId();
  if (id) return { kind: 'account', id };

  const day = utcDay();
  const guest = parseGuestCookie(cookies().get(GUEST_COOKIE)?.value);
  if (guest?.day === day) return { kind: 'guest', hash: guest.hash };
  return options.create ? createGuest(day) : null;
}

/**
 * Pasa la partida de invitado a la cuenta al iniciar sesión. Si la cuenta ya
 * jugó ese día, se queda su partida. `done` indica si se puede borrar la cookie.
 */
export async function claimGuestPlay(cookieValue: string | undefined, anilistId: number): Promise<{ done: boolean; claimed: boolean }> {
  const guest = parseGuestCookie(cookieValue);
  if (!guest) return { done: true, claimed: false };
  if (guest.day !== utcDay() && guest.day !== utcDay(-1)) return { done: true, claimed: false };

  const { data, error } = await createAdminClient().rpc(
    'claim_guest_play' as never,
    { p_guest_hash: guest.hash, p_day: guest.day, p_anilist_id: anilistId } as never
  );
  if (error) {
    console.error('[reto] No se pudo conservar la partida de invitado:', error.message);
    return { done: false, claimed: false };
  }
  return { done: true, claimed: (data as unknown as string) === 'claimed' };
}
