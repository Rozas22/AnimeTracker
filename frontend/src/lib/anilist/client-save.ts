import { saveAnimeProgressAction } from './actions';

/** Invalida la caché de tu colección sin refrescar la página que estás usando. */
export function refreshCollectionCache(): void {
  void fetch('/coleccion/refrescar', { method: 'POST', keepalive: true }).catch(() => undefined);
}

/** Guarda el progreso y después invalida la caché de la colección. */
export async function saveProgress(
  input: Parameters<typeof saveAnimeProgressAction>[0]
): ReturnType<typeof saveAnimeProgressAction> {
  const result = await saveAnimeProgressAction(input);
  refreshCollectionCache();
  return result;
}
