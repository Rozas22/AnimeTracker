'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { countMetric } from './server';

const MAX_PER_HOUR = 200;
const recent = new Map<string, { count: number; resetAt: number }>();

/** Freno temporal en memoria: la conexión no se guarda en ningún sitio. */
function allowed(): boolean {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = createHash('sha256').update(ip).digest('hex');
  const now = Date.now();
  if (recent.size > 5000) recent.clear();
  const entry = recent.get(key);
  if (!entry || entry.resetAt <= now) {
    recent.set(key, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_HOUR;
}

/** Eventos que solo ve el navegador. Se ejecuta al abrir la página, así no cuenta bots de vista previa. */
export async function trackRetoMetricAction(kind: 'visit' | 'share', source: string): Promise<void> {
  const valid = kind === 'visit' ? ['direct', 'shared'] : kind === 'share' ? ['native', 'copy', 'image'] : [];
  if (!valid.includes(source) || !allowed()) return;
  await countMetric(kind === 'visit' ? 'reto_visit' : 'result_shared', source);
}
