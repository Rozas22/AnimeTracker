import { NextResponse } from 'next/server';
import { updateSelectedFrameAction } from '@/lib/anilist/actions';
import type { FrameType } from '@/lib/league';

const FRAMES: readonly string[] = ['none', 'bronze', 'silver', 'gold', 'ruby', 'diamond', 'chroma'];

/**
 * POST /perfil/marco  { anilistUserId: number, frame: FrameType | null }
 * Guarda el marco elegido sin volver a renderizar la página (una server action
 * en una página dinámica re-renderiza el árbol y espera a AniList).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Petición no válida.' }, { status: 400 });
  }

  const { anilistUserId, frame } = (body ?? {}) as { anilistUserId?: unknown; frame?: unknown };
  if (typeof anilistUserId !== 'number' || !Number.isFinite(anilistUserId)) {
    return NextResponse.json({ success: false, error: 'Usuario no válido.' }, { status: 400 });
  }
  if (frame !== null && (typeof frame !== 'string' || !FRAMES.includes(frame))) {
    return NextResponse.json({ success: false, error: 'Marco no válido.' }, { status: 400 });
  }

  const result = await updateSelectedFrameAction({ anilistUserId, frame: frame as FrameType | null });
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
