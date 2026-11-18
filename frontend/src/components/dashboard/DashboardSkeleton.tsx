import React from 'react';

/** Esqueleto de carga con la forma del Muro: cabecera, cifras y una fila de carteles. */
export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="grid gap-8 rounded-[18px] bg-card p-5 sm:p-8 lg:grid-cols-[1fr_minmax(300px,380px)] lg:p-10">
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-[14px] bg-popover sm:h-28 sm:w-28" />
            <div className="space-y-3">
              <div className="h-9 w-56 rounded-md bg-popover" />
              <div className="h-4 w-40 rounded bg-popover" />
            </div>
          </div>
          <div className="h-2.5 max-w-xl rounded-full bg-popover" />
        </div>
        <div className="h-44 rounded-[14px] bg-popover" />
      </div>

      <div className="h-64 rounded-[18px] bg-card" />

      <div className="space-y-3">
        <div className="h-6 w-40 rounded bg-card" />
        <div className="flex gap-4 overflow-hidden pt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] w-[38vw] max-w-[172px] shrink-0 rounded-[10px] bg-card sm:w-[172px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
