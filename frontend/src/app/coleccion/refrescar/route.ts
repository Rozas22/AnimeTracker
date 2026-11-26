import { revalidateTag } from 'next/cache';
import { getVerifiedAniListId } from '@/lib/session-server';

export const dynamic = 'force-dynamic';

/**
 * POST /coleccion/refrescar → invalida la caché de la colección de quien llama.
 * Va aparte de las server actions: si se invalida dentro de una acción, Next
 * vuelve a pintar la página en mitad del guardado y cierra la ficha abierta.
 */
export async function POST(): Promise<Response> {
  const id = await getVerifiedAniListId();
  if (!id) return new Response(null, { status: 401 });
  revalidateTag(`anilist-collection-${id}`);
  return new Response(null, { status: 204 });
}
