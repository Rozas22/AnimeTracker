import { renderResultCard } from '@/lib/reto/card';
import { resolvePlayer } from '@/lib/reto/guest';
import { getOrCreateChallenge, loadPlay, todayUTC } from '@/lib/reto/server';
import { challengeNumber, markOf } from '@/lib/reto/share';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };

/** GET /reto/tarjeta/resultado → imagen con el resultado real de quien la pide. */
export async function GET(): Promise<Response> {
  const player = await resolvePlayer();
  if (!player) return new Response('Sin partida', { status: 404, headers: noStore });

  const day = todayUTC();
  const [rounds, play] = await Promise.all([getOrCreateChallenge(day), loadPlay(player, day)]);
  if (!play || play.results.length < rounds.length) {
    return new Response('Partida sin terminar', { status: 404, headers: noStore });
  }
  return renderResultCard(challengeNumber(day), play.score, rounds.map((_, i) => markOf(play.results[i])), noStore);
}
