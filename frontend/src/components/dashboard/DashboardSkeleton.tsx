import React from 'react';

export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Cargando Dashboard"
    >
      {/* Skeleton Hero (8 + 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="bento-card lg:col-span-8 h-72 bg-card/50 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-5">
            <div className="h-24 w-24 rounded-2xl bg-white/[0.06]" />
            <div className="space-y-3 flex-1">
              <div className="h-5 w-32 rounded-full bg-white/[0.06]" />
              <div className="h-8 w-48 rounded-lg bg-white/[0.08]" />
              <div className="h-4 w-40 rounded bg-white/[0.05]" />
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t border-white/[0.05]">
            <div className="h-4 w-56 rounded bg-white/[0.06]" />
            <div className="h-4 w-full rounded-full bg-white/[0.08]" />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bento-card flex-1 h-32 bg-card/50 p-5" />
          <div className="bento-card flex-1 h-32 bg-card/50 p-5" />
        </div>
      </div>

      {/* Skeleton KPIs (4 cols) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="bento-card h-28 bg-card/50 p-5" />
        ))}
      </div>

      {/* Skeleton Distribución + Géneros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="bento-card lg:col-span-7 h-60 bg-card/50 p-6" />
        <div className="bento-card lg:col-span-5 h-60 bg-card/50 p-6" />
      </div>
    </div>
  );
}
