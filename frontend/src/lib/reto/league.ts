// Solo servidor. Sin next/headers para poder usarse también desde pages/api (crons).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey, getSupabaseUrl } from '@/lib/supabase/env';
import { PODIUM_BONUS } from './types';

const admin = (): SupabaseClient => createClient(getSupabaseUrl(), getSupabaseServerKey(), { auth: { persistSession: false } });

/** Suma PL a la liga mensual (y al total histórico) de un usuario. */
export async function addLeaguePoints(anilistId: number, pl: number, client: SupabaseClient = admin()): Promise<void> {
  if (!(pl > 0)) return;
  const { data: u } = await client
    .from('users')
    .select('monthly_quiz_points, quiz_points')
    .eq('anilist_id', anilistId)
    .maybeSingle();
  if (!u) return;
  await client
    .from('users')
    .update({
      monthly_quiz_points: (u.monthly_quiz_points ?? 0) + pl,
      quiz_points: (u.quiz_points ?? 0) + pl,
      last_updated_at: new Date().toISOString(),
    })
    .eq('anilist_id', anilistId);
}

const yesterdayUTC = (): string => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/**
 * Reparte el bonus del podio del Reto de un día (por defecto, ayer en UTC) a
 * los 3 mejores. Es idempotente: el día se marca antes de repartir, así que
 * aunque lo llamen dos crons solo uno lo hace.
 */
export async function awardChallengePodium(day: string = yesterdayUTC()): Promise<{ day: string; awarded: Array<{ anilist_id: number; place: number; bonus: number }> | null }> {
  const client = admin();

  const { data: claimed, error } = await client
    .from('daily_challenges')
    .update({ podium_awarded_at: new Date().toISOString() })
    .eq('day', day)
    .is('podium_awarded_at', null)
    .select('day');
  if (error) throw new Error(`Podio del reto: ${error.message}`);
  if (!claimed || claimed.length === 0) return { day, awarded: null }; // ya repartido o sin reto ese día

  const { data: top } = await client
    .from('challenge_plays')
    .select('anilist_id, score, finished_at')
    .eq('day', day)
    .not('finished_at', 'is', null)
    .gt('score', 0)
    .order('score', { ascending: false })
    .order('finished_at', { ascending: true }) // empate: gana quien terminó antes
    .limit(PODIUM_BONUS.length);

  const awarded = (top ?? []).map((p, i) => ({ anilist_id: p.anilist_id as number, place: i + 1, bonus: PODIUM_BONUS[i]! }));
  for (const a of awarded) await addLeaguePoints(a.anilist_id, a.bonus, client);

  await client.from('daily_challenges').update({ podium: awarded }).eq('day', day);
  return { day, awarded };
}
