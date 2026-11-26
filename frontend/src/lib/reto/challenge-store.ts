// Solo servidor. Sin next/headers para poder usarse también desde pages/api (crons).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerKey, getSupabaseUrl } from '@/lib/supabase/env';
import { buildChallenge, type FullRound } from './generate';

/** Un intento de generar por minuto como mucho, aunque AniList esté caído. */
const LOCK_TTL_MS = 60_000;
const WAIT_ATTEMPTS = 12;
const WAIT_MS = 500;
/** AniList no permite usar la API como almacén: el detalle de cada reto se borra. */
const CHALLENGE_RETENTION_DAYS = 35;
const GUEST_RETENTION_DAYS = 2;
/** La AEPD fija un máximo de 25 meses para datos de medición de audiencia. */
const METRICS_RETENTION_DAYS = 730;

const admin = (): SupabaseClient => createClient(getSupabaseUrl(), getSupabaseServerKey(), { auth: { persistSession: false } });

export const utcDay = (offsetDays = 0): string => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

async function readRounds(client: SupabaseClient, day: string): Promise<FullRound[] | null> {
  const { data, error } = await client.from('daily_challenges').select('rounds').eq('day', day).maybeSingle();
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
    throw new Error('Falta crear las tablas del reto (supabase_migration_reto.sql).');
  }
  return (data?.rounds as FullRound[] | undefined) ?? null;
}

async function takeLock(client: SupabaseClient, day: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: created } = await client
    .from('challenge_generation_locks')
    .upsert({ day, locked_at: now }, { onConflict: 'day', ignoreDuplicates: true })
    .select('day');
  if (created?.length) return true;

  const { data: reclaimed } = await client
    .from('challenge_generation_locks')
    .update({ locked_at: now })
    .eq('day', day)
    .lt('locked_at', new Date(Date.now() - LOCK_TTL_MS).toISOString())
    .select('day');
  return Boolean(reclaimed?.length);
}

/**
 * Devuelve el reto del día. Si no existe, lo genera un único servidor: el número
 * de visitantes no aumenta las llamadas a AniList.
 */
export async function ensureChallenge(day: string, client: SupabaseClient = admin()): Promise<FullRound[]> {
  const stored = await readRounds(client, day);
  if (stored) return stored;

  if (await takeLock(client, day)) {
    let rounds: FullRound[];
    try {
      rounds = await buildChallenge(day);
    } catch (e) {
      // El candado se queda: el siguiente intento esperará a que caduque
      console.error('[reto] No se pudo generar el reto:', e);
      throw new Error('AniList no responde y el reto de hoy aún no está listo. Inténtalo en unos minutos.');
    }
    await client.from('daily_challenges').upsert({ day, rounds }, { onConflict: 'day', ignoreDuplicates: true });
    await client.from('challenge_generation_locks').delete().eq('day', day);
    return (await readRounds(client, day)) ?? rounds;
  }

  for (let i = 0; i < WAIT_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, WAIT_MS));
    const ready = await readRounds(client, day);
    if (ready) return ready;
  }
  throw new Error('El reto de hoy se está preparando. Inténtalo en unos segundos.');
}

/** Tarea diaria: deja listos hoy y mañana y borra lo que ya no hace falta guardar. */
export async function runRetoMaintenance(): Promise<{ today: boolean; tomorrow: boolean }> {
  const client = admin();
  const ready = async (day: string): Promise<boolean> => {
    try {
      await ensureChallenge(day, client);
      return true;
    } catch (e) {
      console.error(`[reto] Sin reto para ${day}:`, e);
      return false;
    }
  };
  const today = await ready(utcDay());
  const tomorrow = await ready(utcDay(1));

  const cutoff = utcDay(-CHALLENGE_RETENTION_DAYS);
  await client.from('guest_plays').delete().lt('day', utcDay(-GUEST_RETENTION_DAYS));
  await client.from('daily_challenges').delete().lt('day', cutoff);
  await client.from('metric_daily').delete().lt('day', utcDay(-METRICS_RETENTION_DAYS));
  await client.from('challenge_generation_locks').delete().lt('day', utcDay(-1));
  await client.from('challenge_plays').update({ results: [], round_state: null }).lt('day', cutoff).neq('results', '[]');
  return { today, tomorrow };
}
