'use client';

import React, { useState } from 'react';
import { Copy, ImageDown, Loader2, Share2 } from 'lucide-react';
import { trackRetoMetricAction } from '@/lib/metrics/actions';
import { buildShareText } from '@/lib/reto/share';
import type { RetoState } from '@/lib/reto/types';

const isCancel = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Compartir sin spoilers: nativo en móvil, copiar como alternativa e imagen para historias. */
export function ShareResult({ state }: { state: RetoState }): React.JSX.Element {
  const [status, setStatus] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  const say = (message: string): void => {
    setStatus(message);
    window.setTimeout(() => setStatus(''), 2600);
  };

  const copy = async (): Promise<void> => {
    const ok = await copyText(buildShareText(state, window.location.origin));
    say(ok ? 'Resultado copiado' : 'No se pudo copiar');
    if (ok) void trackRetoMetricAction('share', 'copy');
  };

  const share = async (): Promise<void> => {
    const text = buildShareText(state, window.location.origin);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        void trackRetoMetricAction('share', 'native');
        return;
      } catch (e) {
        if (isCancel(e)) return;
      }
    }
    const ok = await copyText(text);
    say(ok ? 'Resultado copiado' : 'No se pudo copiar');
    if (ok) void trackRetoMetricAction('share', 'copy');
  };

  const shareImage = async (): Promise<void> => {
    setLoadingImage(true);
    try {
      const res = await fetch('/reto/tarjeta/resultado', { cache: 'no-store' });
      if (!res.ok) throw new Error('imagen');
      const blob = await res.blob();
      const name = `reto-kurama-${state.number}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        void trackRetoMetricAction('share', 'image');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      say('Imagen descargada');
      void trackRetoMetricAction('share', 'image');
    } catch (e) {
      if (!isCancel(e)) say('No se pudo crear la imagen');
    } finally {
      setLoadingImage(false);
    }
  };

  const secondary = 'inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-white/[0.07] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12] disabled:opacity-60';

  return (
    <div className="mt-6">
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1.4fr)_auto_auto]">
        <button type="button" onClick={() => void share()} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-kurama px-6 font-semibold text-ink sm:h-11">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartir resultado
        </button>
        <div className="grid grid-cols-2 gap-2.5 sm:contents">
          <button type="button" onClick={() => void copy()} className={secondary}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copiar
          </button>
          <button type="button" onClick={() => void shareImage()} disabled={loadingImage} className={secondary}>
            {loadingImage ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageDown className="h-4 w-4" aria-hidden="true" />}
            Imagen
          </button>
        </div>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm font-medium text-kurama">{status}</p>
      <p className="text-sm text-muted-foreground">Sin spoilers: solo se comparte tu puntuación. Mañana a la 1:00 (hora de España) hay un reto nuevo.</p>
    </div>
  );
}
