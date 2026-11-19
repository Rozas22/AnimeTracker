import sharp from 'sharp';
import { getVerifiedAniListId } from '@/lib/session-server';
import { getOrCreateChallenge, loadPlay, todayUTC } from '@/lib/reto/server';
import { PIXEL_STEPS, PIXEL_STEP_SECONDS } from '@/lib/reto/types';

export const dynamic = 'force-dynamic';

const imageCache = new Map<string, Buffer>();

async function fetchImage(url: string): Promise<Buffer | null> {
  const hit = imageCache.get(url);
  if (hit) return hit;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (imageCache.size > 40) imageCache.clear();
  imageCache.set(url, buf);
  return buf;
}

const noStore = { 'Cache-Control': 'private, no-store' };

/**
 * GET /arena/reto/imagen?r=<ronda>
 * Sirve la imagen de la ronda sin revelar su URL de AniList. En las rondas de
 * portada, la resolución depende del tiempo transcurrido según el servidor, así
 * que no se puede pedir la imagen nítida antes de tiempo.
 */
export async function GET(request: Request): Promise<Response> {
  const id = await getVerifiedAniListId();
  if (!id) return new Response('No autorizado', { status: 401 });

  const r = Number(new URL(request.url).searchParams.get('r'));
  const day = todayUTC();
  const [rounds, play] = await Promise.all([getOrCreateChallenge(day), loadPlay(id, day)]);
  const round = rounds[r];
  if (!play || !round || (round.type !== 'cover' && round.type !== 'character')) {
    return new Response('No disponible', { status: 404 });
  }

  const finished = r < play.results.length;
  const inProgress = r === play.results.length && Boolean(play.round_started_at);
  if (!finished && !inProgress) return new Response('Aún no', { status: 403 });

  const src = round.type === 'cover' ? round.cover : round.image;
  const original = await fetchImage(src);
  if (!original) return new Response('Imagen no disponible', { status: 502 });

  if (round.type === 'character' || finished) {
    const out = await sharp(original).resize({ width: 460, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(out), { headers: { 'Content-Type': 'image/webp', ...noStore } });
  }

  // Portada en curso: escalón de pixelado según los segundos transcurridos
  const elapsed = (Date.now() - new Date(play.round_started_at!).getTime()) / 1000;
  const step = Math.min(PIXEL_STEPS.length - 1, Math.max(0, Math.floor(elapsed / PIXEL_STEP_SECONDS)));
  const width = PIXEL_STEPS[step]!;
  const out = await sharp(original).resize({ width, kernel: 'cubic' }).png().toBuffer();
  return new Response(new Uint8Array(out), {
    headers: { 'Content-Type': 'image/png', 'X-Reto-Step': String(step), ...noStore },
  });
}
