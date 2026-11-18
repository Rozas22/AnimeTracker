import React from 'react';
import { BarChart3 } from 'lucide-react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { StatsBentoGrid } from '@/components/dashboard/StatsBentoGrid';
import { TrophyShowcase } from '@/components/dashboard/TrophyShowcase';

export default async function AnalisisPage(): Promise<React.JSX.Element> {
  const authUser = await getServerAuthenticatedUser();
  const episodesWatched = authUser.unifiedLevel.totalEpisodesWatched;
  const computedLevel = authUser.unifiedLevel.computedLevel;

  return (
    <div className="space-y-6">
      <div className="bento-card p-6 flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kurama/15 border border-kurama/35 text-kurama">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            Análisis y Métricas Detalladas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Desglose profundo de tu historial de visualización ({episodesWatched.toLocaleString('es-ES')} episodios • Nivel {computedLevel}).
          </p>
        </div>
      </div>

      <StatsBentoGrid statistics={authUser.anilistViewer?.statistics?.anime} />

      <TrophyShowcase
        currentLevel={computedLevel}
        totalEpisodesWatched={episodesWatched}
        achievements={authUser.achievements}
      />
    </div>
  );
}
