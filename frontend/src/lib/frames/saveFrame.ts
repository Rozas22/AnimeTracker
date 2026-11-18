import type { FrameType } from '@/lib/league';

/** Guarda el marco elegido (null = automático) a través de /perfil/marco. */
export async function saveSelectedFrame(
  anilistUserId: number,
  frame: FrameType | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch('/perfil/marco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anilistUserId, frame }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string | null };
    return { success: Boolean(data.success), error: data.error ?? (res.ok ? null : 'No se pudo guardar el marco.') };
  } catch {
    return { success: false, error: 'Sin conexión: no se pudo guardar el marco.' };
  }
}
