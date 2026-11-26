import React from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';

/** Acceso a las ligas privadas desde la Arena. */
export function LigasEntryCard(): React.JSX.Element {
  return (
    <Link href="/ligas" className="flex items-center gap-4 rounded-[18px] bg-card p-5 transition-transform duration-200 hover:-translate-y-0.5" style={{ boxShadow: 'var(--shadow-tile)' }}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-white/[0.06] text-kurama">
        <Users className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold text-white">Ligas privadas</span>
        <span className="block text-sm text-muted-foreground">Crea una liga e invita a tus amigos al Reto diario.</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
