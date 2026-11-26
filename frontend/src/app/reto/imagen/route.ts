import sharp from 'sharp';
import { resolvePlayer } from '@/lib/reto/guest';
import { getOrCreateChallenge, loadPlay, todayUTC } from '@/lib/reto/server';
import { PIXEL_STEPS, PIXEL_STEP_SECONDS } from '@/lib/reto/types';

export const dynamic = 'force-dynamic';

const MAX_CACHED = 80;
const originals = new Map<string, Buffer>();
const rendered = new Map<string, Buffer>();

function remember(cache: Map<string, Buffer>, key: string, value: Buffer): Buffer {
  if (cache.size >= MAX_CACHED) cache.clear();
  cache.set(key, value);
  return value;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  const hit = originals.get(url);
  if (hit) return hit;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return remember(originals, url, Buffer.from(await res.arrayBuffer()));
}

async function sharpImage(src: string): Promise<Buffer | null> {
  const key = `full:${src}`;
  const hit = rendered.get(key);
  if (hit) return hit;
  const original = await fetchImage(src);
  if (!original) return null;
  return remember(rendered, key, await sharp(original).resize({ width: 460, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer());
}

async function pixelImage(src: string, width: number): Promise<Buffer | null> {
  const key = `pixel:${width}:${src}`;
  const hit = rendered.get(key);
  if (hit) return hit;
  const original = await fetchImage(src);
  if (!original) return null;
  return remember(rendered, key, await sharp(original).resize({ width, kernel: 'cubic' }).png().toBuffer());
}

const noStore = { 'Cache-Control': 'private, no-store' };

/**
 * GET /reto/imagen?r=<ronda>[&p=<pareja>&side=a|b]
 * Sirve las imágenes desde el servidor sin revelar su URL de AniList. En las
 * rondas de portada, la resolución depende del tiempo transcurrido según el
 * servidor, así que no se puede pedir la imagen nítida antes de tiempo.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const r = Number(params.get('r'));
  const day = todayUTC();
  let rounds;
  try {
    rounds = await getOrCreateChallenge(day);
  } catch {
    return new Response('Reto no disponible', { status: 503, headers: noStore });
  }
  const round = Number.isInteger(r) ? rounds[r] : undefined;
  if (!round) return new Response('No disponible', { status: 404, headers: noStore });

  // Portadas de los duelos de nota: ya se muestran con su título, no son secretas
  if (round.type === 'score') {
    const pair = round.pairs[Number(params.get('p'))];
    const side = params.get('side');
    if (!pair || (side !== 'a' && side !== 'b')) return new Response('No disponible', { status: 404, headers: noStore });
    const out = await sharpImage(pair[side].cover);
    if (!out) return new Response('Imagen no disponible', { status: 502, headers: noStore });
    return new Response(new Uint8Array(out), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600' } });
  }

  const player = await resolvePlayer();
  if (!player) return new Response('No autorizado', { status: 401, headers: noStore });
  const play = await loadPlay(player, day);
  if (!play || (round.type !== 'cover' && round.type !== 'character')) {
    return new Response('No disponible', { status: 404, headers: noStore });
  }

  const finished = r < play.results.length;
  const inProgress = r === play.results.length && Boolean(play.round_started_at);
  if (!finished && !inProgress) return new Response('Aún no', { status: 403, headers: noStore });

  const src = round.type === 'cover' ? round.cover : round.image;
  if (round.type === 'character' || finished) {
    const out = await sharpImage(src);
    if (!out) return new Response('Imagen no disponible', { status: 502, headers: noStore });
    return new Response(new Uint8Array(out), { headers: { 'Content-Type': 'image/webp', ...noStore } });
  }

  // Portada en curso: escalón de pixelado según los segundos transcurridos
  const elapsed = (Date.now() - new Date(play.round_started_at!).getTime()) / 1000;
  const step = Math.min(PIXEL_STEPS.length - 1, Math.max(0, Math.floor(elapsed / PIXEL_STEP_SECONDS)));
  const out = await pixelImage(src, PIXEL_STEPS[step]!);
  if (!out) return new Response('Imagen no disponible', { status: 502, headers: noStore });
  return new Response(new Uint8Array(out), {
    headers: { 'Content-Type': 'image/png', 'X-Reto-Step': String(step), ...noStore },
  });
}
