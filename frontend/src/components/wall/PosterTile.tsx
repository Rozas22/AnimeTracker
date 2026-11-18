'use client';

import React, { useCallback, useRef } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PosterTileProps {
  title: string;
  coverUrl: string | null;
  /** Color dominante del cartel (AniList coverImage.color) para el fondo mientras carga */
  tint?: string | null;
  /** Línea secundaria bajo el título (p. ej. "Ep 7 de 12") */
  meta?: string;
  /** Etiqueta superior izquierda (p. ej. "Mié 18:00", "En emisión") */
  badge?: string;
  /** Variante del badge */
  badgeTone?: 'live' | 'neutral' | 'accent';
  /** Nota visible (0-10) en la esquina superior derecha */
  score?: number | null;
  /** Progreso 0-100: dibuja la barra lima bajo el cartel */
  progress?: number | null;
  /** Ranking grande pintado junto al cartel (Top 10) */
  rank?: number;
  onSelect?: () => void;
  /** Acción rápida +1 episodio */
  onIncrement?: () => void;
  incrementLabel?: string;
  isBusy?: boolean;
  className?: string;
  priority?: boolean;
  /** Cartel destacado ancho (16:10 sobre la misma altura) con giro 3D permanente */
  featured?: boolean;
}

const MAX_TILT = 11; // grados

/**
 * Cartel 2:3 del Muro de Streaming.
 * Firma: se inclina en 3D hacia el puntero, con un brillo especular que sigue
 * al ratón y una elevación en Z. Con movimiento reducido solo escala.
 */
export function PosterTile({
  title,
  coverUrl,
  tint,
  meta,
  badge,
  badgeTone = 'neutral',
  score,
  progress,
  rank,
  onSelect,
  onIncrement,
  incrementLabel,
  isBusy = false,
  className,
  priority = false,
  featured = false,
}: PosterTileProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${(px - 0.5) * MAX_TILT * 2}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * MAX_TILT * 2}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  }, []);

  return (
    <div className={cn('poster-tile group/tile relative shrink-0', featured && 'poster-tile--featured', rank ? 'pl-10 sm:pl-14' : '', className)}>
      {rank !== undefined && (
        <span
          aria-hidden="true"
          className="poster-rank pointer-events-none absolute bottom-6 left-0 z-0 font-display text-[88px] sm:text-[120px] font-extrabold leading-none tabular"
        >
          {rank}
        </span>
      )}

      <div className="relative z-10" style={{ perspective: '900px' }}>
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className={cn('poster-card relative w-full overflow-hidden rounded-[10px]', featured ? 'aspect-[4/3] sm:aspect-auto sm:h-[258px]' : 'aspect-[2/3]')}
          style={{ backgroundColor: tint ?? '#1e222d' }}
        >
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Abrir ${title}`}
            className="absolute inset-0 z-10 rounded-[10px] focus-visible:outline-offset-[3px]"
          />

          {coverUrl && (
            <Image
              src={coverUrl}
              alt=""
              fill
              sizes={featured ? '(max-width: 640px) 80vw, 420px' : '(max-width: 640px) 40vw, 200px'}
              className="object-cover"
              unoptimized={coverUrl.startsWith('http')}
              priority={priority}
            />
          )}

          {/* Brillo especular que sigue al puntero */}
          <span aria-hidden="true" className="poster-sheen pointer-events-none absolute inset-0 z-[5]" />
          {/* Pie oscuro para que el texto se lea */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
          />

          <div className="pointer-events-none absolute inset-x-2 top-2 z-[15] flex items-start justify-between gap-1.5">
            {badge ? (
              <span
                className={cn(
                  'min-w-0 truncate whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight tabular',
                  badgeTone === 'live' && 'bg-white text-ink',
                  badgeTone === 'accent' && 'bg-kurama text-ink',
                  badgeTone === 'neutral' && 'bg-black/70 text-white'
                )}
              >
                {badge}
              </span>
            ) : (
              <span />
            )}
            {score !== null && score !== undefined && score > 0 && (
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular">
                {score.toFixed(1)}
              </span>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-[15]">
            <p className={cn('line-clamp-2 font-semibold leading-snug text-white', featured ? 'text-lg sm:text-xl' : 'text-[13px]')}>{title}</p>
            {meta && <p className={cn('mt-0.5 truncate text-white/75 tabular', featured ? 'text-sm' : 'text-[11px]')}>{meta}</p>}
          </div>

        </div>

        {((progress !== null && progress !== undefined) || onIncrement) && (
          <div className="mt-2 flex h-7 items-center gap-2">
            {progress !== null && progress !== undefined ? (
              <div
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso de ${title}`}
              >
                <div className="h-full rounded-full bg-kurama transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
            ) : (
              <span className="flex-1" />
            )}
            {onIncrement && (
              <button
                type="button"
                onClick={onIncrement}
                disabled={isBusy}
                aria-label={incrementLabel ?? `Sumar un episodio a ${title}`}
                className="flex h-7 shrink-0 items-center gap-0.5 rounded-full bg-popover px-2.5 text-xs font-semibold text-kurama transition-[transform,background-color] duration-200 hover:bg-kurama hover:text-ink active:scale-95 disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                1 ep
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
