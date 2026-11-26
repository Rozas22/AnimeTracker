// Solo servidor: contadores diarios agregados. Nunca guarda quién hizo cada acción.
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { ADMIN_ANILIST_ID } from '@/lib/session-verify';
import { getVerifiedAniListId } from '@/lib/session-server';

/** Marca el navegador del administrador para no contarlo aunque cierre sesión. */
export const NO_METRICS_COOKIE = 'kurama_no_metrics';

export type MetricEvent =
  | 'reto_visit'
  | 'game_started'
  | 'game_finished'
  | 'result_shared'
  | 'guest_saved'
  | 'signup_after_play'
  | 'league_created'
  | 'league_joined';

/* Las tablas de métricas no están en los tipos generados de Supabase */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (): any => createAdminClient();

async function isExcluded(actor?: number): Promise<boolean> {
  if (actor === ADMIN_ANILIST_ID) return true;
  if (cookies().get(NO_METRICS_COOKIE)?.value === '1') return true;
  return actor === undefined && (await getVerifiedAniListId()) === ADMIN_ANILIST_ID;
}

/** Suma 1 al total del día. Un fallo aquí nunca debe afectar al juego. */
export async function countMetric(event: MetricEvent, source = 'all', actor?: number): Promise<void> {
  try {
    if (await isExcluded(actor)) return;
    const { error } = await db().rpc('increment_metric', {
      p_day: new Date().toISOString().slice(0, 10),
      p_event: event,
      p_source: source,
    });
    if (error) console.warn('[métricas]', error.message);
  } catch (e) {
    console.warn('[métricas]', e);
  }
}

export interface MetricsReport {
  days: number;
  totals: {
    visits: number;
    sharedVisits: number;
    started: number;
    startedGuest: number;
    finished: number;
    finishedGuest: number;
    shared: number;
    guestSaved: number;
    signups: number;
    leaguesCreated: number;
    leaguesJoined: number;
  };
  daily: Array<{ day: string; visits: number; sharedVisits: number; started: number; finished: number; shared: number; signups: number; leagues: number }>;
  retention: { players: number; cohorts: Array<{ days: number; eligible: number; retained: number }> };
}

export async function getMetricsReport(days: number): Promise<MetricsReport> {
  const now = Date.now();
  const from = new Date(now - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const today = new Date(now).toISOString().slice(0, 10);
  const [{ data, error }, { data: retention, error: retentionError }] = await Promise.all([
    db().from('metric_daily').select('day, event, source, count').gte('day', from).order('day', { ascending: false }).limit(5000),
    db().rpc('metric_retention', { p_exclude: ADMIN_ANILIST_ID, p_today: today }),
  ]);
  if (error || retentionError) throw new Error('Faltan las métricas (supabase_migration_metricas.sql).');

  const rows = (data ?? []) as Array<{ day: string; event: MetricEvent; source: string; count: number }>;
  const sum = (event: MetricEvent, source?: string, day?: string): number =>
    rows.filter((r) => r.event === event && (!source || r.source === source) && (!day || r.day === day)).reduce((a, r) => a + Number(r.count), 0);

  const dayList = Array.from({ length: days }, (_, i) => new Date(now - i * 86_400_000).toISOString().slice(0, 10));
  return {
    days,
    totals: {
      visits: sum('reto_visit'),
      sharedVisits: sum('reto_visit', 'shared'),
      started: sum('game_started'),
      startedGuest: sum('game_started', 'guest'),
      finished: sum('game_finished'),
      finishedGuest: sum('game_finished', 'guest'),
      shared: sum('result_shared'),
      guestSaved: sum('guest_saved'),
      signups: sum('signup_after_play'),
      leaguesCreated: sum('league_created'),
      leaguesJoined: sum('league_joined'),
    },
    daily: dayList
      .map((day) => ({
        day,
        visits: sum('reto_visit', undefined, day),
        sharedVisits: sum('reto_visit', 'shared', day),
        started: sum('game_started', undefined, day),
        finished: sum('game_finished', undefined, day),
        shared: sum('result_shared', undefined, day),
        signups: sum('signup_after_play', undefined, day),
        leagues: sum('league_created', undefined, day),
      }))
      .filter((d) => d.visits || d.started || d.finished || d.shared || d.signups || d.leagues),
    retention: retention as MetricsReport['retention'],
  };
}
