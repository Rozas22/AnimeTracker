'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Gift, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PrizeGalleryProps {
  images: string[];
  title: string;
}

/**
 * Vitrina del premio: foto principal + miniaturas. Al tocar cualquiera se abre
 * en grande con flechas, miniaturas, teclado (← → Esc) y deslizar en móvil.
 */
export function PrizeGallery({ images, title }: PrizeGalleryProps): React.JSX.Element {
  const [open, setOpen] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="arena-prize__case relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-[18px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] sm:h-32 sm:w-32">
        <Gift className="h-12 w-12 text-[#e3b341]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(0)}
        aria-label={`Ver fotos del premio: ${title}`}
        className="arena-prize__case group relative grid h-28 w-28 place-items-center overflow-hidden rounded-[18px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] sm:h-32 sm:w-32"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <span aria-hidden="true" className="arena-prize__shine pointer-events-none absolute inset-0" />
        <span aria-hidden="true" className="absolute bottom-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>
      {images.length > 1 && (
        <div className="flex gap-1.5">
          {images.slice(1).map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setOpen(i + 1)}
              aria-label={`Ver foto ${i + 2} de ${images.length}`}
              className="h-9 w-9 overflow-hidden rounded-[8px] ring-1 ring-white/10 transition hover:ring-[#e3b341]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {open !== null && <Lightbox images={images} title={title} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Lightbox({
  images,
  title,
  start,
  onClose,
}: {
  images: string[];
  title: string;
  start: number;
  onClose: () => void;
}): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(start);
  const [touchX, setTouchX] = useState<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, go]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos del premio: ${title}`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate font-display text-base font-semibold text-white">
          {title}
          {n > 1 && <span className="ml-2 font-normal text-white/60 tabular">{i + 1} / {n}</span>}
        </p>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const x = e.changedTouches[0]?.clientX;
          if (touchX !== null && x !== undefined && Math.abs(x - touchX) > 40) go(x < touchX ? 1 : -1);
          setTouchX(null);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[i]}
          src={images[i]}
          alt={`${title} · foto ${i + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-[14px] object-contain shadow-2xl"
          style={{ maxWidth: 'min(100%, 1100px)' }}
        />
        {n > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Foto anterior" className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-white/15 sm:left-6">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Foto siguiente" className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-white/15 sm:right-6">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="flex justify-center gap-2 px-4 py-4" onClick={(e) => e.stopPropagation()}>
          {images.map((src, j) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(j)}
              aria-label={`Foto ${j + 1}`}
              aria-current={j === i}
              className={cn('h-14 w-14 overflow-hidden rounded-[10px] transition', j === i ? 'ring-2 ring-[#e3b341]' : 'opacity-50 hover:opacity-100')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
