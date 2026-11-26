import { renderPreviewCard } from '@/lib/reto/card';
import { parseChallengeNumber, todayChallengeNumber } from '@/lib/reto/share';

export const dynamic = 'force-dynamic';

/** GET /reto/tarjeta?n=<reto> → imagen de la vista previa del enlace. */
export async function GET(request: Request): Promise<Response> {
  const n = parseChallengeNumber(new URL(request.url).searchParams.get('n')) ?? todayChallengeNumber();
  return renderPreviewCard(n, { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' });
}
