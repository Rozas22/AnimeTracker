import React from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, Lightbulb, Star, UserRound } from 'lucide-react';

/** Acceso al Reto diario desde la Arena. */
export function RetoEntryCard(): React.JSX.Element {
  const icons = [Eye, Lightbulb, UserRound, Star, Eye];
  return (
    <Link
      href="/arena/reto"
      className="group relative flex flex-col gap-5 overflow-hidden rounded-[18px] bg-card p-6 transition-transform duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:p-7"
      style={{ boxShadow: 'var(--shadow-tile)' }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-kurama/10 blur-3xl" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-kurama">Nuevo · Minijuego</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">Reto diario</h2>
        <p className="mt-1 max-w-lg text-sm text-white/70">
          5 rondas: portadas pixeladas, pistas, personajes y duelos de nota. Una partida al día y ranking propio.
        </p>
        <ol className="mt-4 flex gap-2" aria-hidden="true">
          {icons.map((Icon, i) => (
            <li key={i} className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.06] text-white/80">
              <Icon className="h-4 w-4" />
            </li>
          ))}
        </ol>
      </div>
      <span className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-kurama px-6 font-display font-bold text-ink transition-transform group-hover:scale-[1.03]">
        Jugar el reto
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
