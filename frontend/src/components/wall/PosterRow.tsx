'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PosterRowProps {
  title: string;
  /** Texto pequeño junto al título (p. ej. "8 series") */
  note?: string;
  seeAllHref?: string;
  /** Ancho de cada cartel en px a partir de sm */
  tileWidth?: number;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
  className?: string;
}

/**
 * Fila horizontal del muro: scroll por cartel, flechas en escritorio
 * y elevación de la fila activa (ver `.wall-rows` en globals.css).
 */
export function PosterRow({
  title,
  note,
  seeAllHref,
  tileWidth = 172,
  children,
  emptyState,
  isEmpty = false,
  className,
}: PosterRowProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows, children]);

  const scrollByPage = (dir: 1 | -1): void => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className={cn('wall-row min-w-0', className)} aria-label={title}>
      <header className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="truncate font-display text-lg sm:text-xl font-semibold text-white">{title}</h2>
          {note && <span className="shrink-0 text-sm text-muted-foreground tabular">{note}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="mr-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
            >
              Ver todo
            </Link>
          )}
          {!isEmpty && (
            <>
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={!canPrev}
                aria-label={`Anterior en ${title}`}
                className="hidden sm:grid h-8 w-8 place-items-center rounded-full bg-popover text-white transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={!canNext}
                aria-label={`Siguiente en ${title}`}
                className="hidden sm:grid h-8 w-8 place-items-center rounded-full bg-popover text-white transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {isEmpty ? (
        emptyState
      ) : (
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="rail-scroll -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-6 md:-mx-8 md:px-8"
          style={{ ['--tile-w' as string]: `${tileWidth}px` }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
