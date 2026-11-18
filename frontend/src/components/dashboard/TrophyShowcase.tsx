'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TROPHY_CONFIG, calculateLevel, type TrophyMilestone } from '@/lib/league';
import { TrophyEmblem } from '@/components/frames/TrophyEmblem';
import { AnimeFrame } from '@/components/frames/AnimeFrame';
import type { UserAchievementRow } from '@/types/database';

export interface TrophyShowcaseProps {
  /** Nivel actual del usuario (o calculado a partir de totalEpisodesWatched) */
  currentLevel?: number;
  /** Total de episodios vistos para calcular el nivel si no se pasa `currentLevel` */
  totalEpisodesWatched?: number;
  /** Logros especiales de Supabase (`public.user_achievements`) */
  achievements?: UserAchievementRow[];
}

/**
 * Vitrina de trofeos: emblemas de metal con el nivel grabado, alas y estrellas
 * que crecen con el rango, y la siguiente misión de nivel destacada.
 */
export function TrophyShowcase({
  currentLevel,
  totalEpisodesWatched = 0,
  achievements = [],
}: TrophyShowcaseProps): React.JSX.Element {
  const [selected, setSelected] = useState<{ m: TrophyMilestone; tier: number } | null>(null);

  const level = useMemo<number>(
    () => (typeof currentLevel === 'number' && currentLevel > 0 ? currentLevel : calculateLevel(totalEpisodesWatched).computedLevel),
    [currentLevel, totalEpisodesWatched]
  );

  const unlockedCount = TROPHY_CONFIG.filter((t) => level >= t.level).length;
  const nextIdx = TROPHY_CONFIG.findIndex((t) => level < t.level);
  const next = nextIdx >= 0 ? TROPHY_CONFIG[nextIdx]! : null;
  const prevLevel = nextIdx > 0 ? TROPHY_CONFIG[nextIdx - 1]!.level : 0;
  const nextProgress = next ? Math.min(100, Math.max(0, ((level - prevLevel) / (next.level - prevLevel)) * 100)) : 100;
  const crowns = achievements.filter((a) => a.achievement_type === 'monthly_winner').length;

  return (
    <section aria-labelledby="trophies-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="trophies-title" className="font-display text-lg font-semibold text-white sm:text-xl">
          Trofeos <span className="ml-2 text-sm font-normal text-muted-foreground tabular">{unlockedCount} de {TROPHY_CONFIG.length}</span>
        </h2>
        {crowns > 0 && (
          <p className="inline-flex items-center gap-2 text-sm text-white">
            <Crown className="h-4 w-4 text-[#e3b341]" aria-hidden="true" />
            {crowns} {crowns === 1 ? 'liga mensual ganada' : 'ligas mensuales ganadas'}
          </p>
        )}
      </div>

      {/* Siguiente misión de nivel */}
      {next && (
        <div className="flex flex-col gap-5 rounded-[18px] bg-card p-5 sm:flex-row sm:items-center sm:p-6" style={{ boxShadow: 'var(--shadow-tile)' }}>
          <div className="emblem-3d mx-auto shrink-0 sm:mx-0">
            <TrophyEmblem level={next.level} tier={nextIdx} accent={next.accentHex} unlocked size={92} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Tu siguiente misión</p>
            <h3 className="mt-0.5 font-display text-xl font-bold text-white">
              Llega al Nv. {next.level}: {next.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {next.description}
              {next.frameName && <> Recompensa: <span className="text-white">{next.frameLabel}</span>.</>}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Progreso de la misión"
                aria-valuenow={Math.round(nextProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-kurama" style={{ width: `${nextProgress}%` }} />
              </div>
              <span className="shrink-0 text-sm text-white tabular">
                {next.level - level} {next.level - level === 1 ? 'nivel' : 'niveles'}
              </span>
            </div>
          </div>
          {next.frameName && (
            <div className="hidden shrink-0 p-6 lg:block" aria-hidden="true">
              <AnimeFrame frame={next.frameName} size={72} detail="full">
                <span className="grid h-full w-full place-items-center bg-[#252a36] font-display text-lg font-bold text-white tabular">
                  {next.level}
                </span>
              </AnimeFrame>
            </div>
          )}
        </div>
      )}

      {/* Vitrina de emblemas */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {TROPHY_CONFIG.map((m, idx) => {
          const unlocked = level >= m.level;
          return (
            <li key={m.level}>
              <button
                type="button"
                onClick={() => setSelected({ m, tier: idx })}
                className={cn(
                  'group flex h-full w-full flex-col items-center rounded-[14px] bg-card px-3 pb-4 pt-5 text-center transition-colors hover:bg-popover',
                  !unlocked && 'opacity-70 hover:opacity-100'
                )}
                style={{ boxShadow: 'var(--shadow-tile)' }}
              >
                <span className="emblem-3d">
                  <TrophyEmblem level={m.level} tier={idx} accent={m.accentHex} unlocked={unlocked} size={84} />
                </span>
                <span className={cn('mt-3 font-display text-sm font-semibold leading-tight', unlocked ? 'text-white' : 'text-muted-foreground')}>
                  {m.title}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{m.frameName ? m.frameLabel : 'Título de honor'}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Detalle */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={selected.m.title}
          >
            <motion.div
              initial={{ scale: 0.94, y: 12, rotateY: -12 }}
              animate={{ scale: 1, y: 0, rotateY: 0 }}
              exit={{ scale: 0.94, y: 12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-[18px] bg-popover p-6 text-center sm:p-8"
              style={{ boxShadow: 'var(--shadow-lift)', transformPerspective: 900 }}
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Cerrar"
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="emblem-3d mx-auto w-fit">
                <TrophyEmblem
                  level={selected.m.level}
                  tier={selected.tier}
                  accent={selected.m.accentHex}
                  unlocked={level >= selected.m.level}
                  size={140}
                />
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-white">{selected.m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nv. {selected.m.level} · {selected.m.frameName ? selected.m.frameLabel : 'Título de honor'}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{selected.m.description}</p>
              <p className="mt-5 rounded-[10px] bg-card px-4 py-3 text-sm text-white tabular">
                {level >= selected.m.level
                  ? `Conseguido · vas por el Nv. ${level}`
                  : `Te faltan ${selected.m.level - level} niveles`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
