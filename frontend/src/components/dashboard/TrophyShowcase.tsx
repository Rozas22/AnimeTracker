'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Lock,
  CheckCircle2,
  Sparkles,
  Crown,
  X,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TROPHY_CONFIG,
  FRAME_STYLES,
  calculateLevel,
  type TrophyMilestone,
} from '@/lib/league';
import type { UserAchievementRow } from '@/types/database';

export interface TrophyShowcaseProps {
  /** Nivel actual del usuario (o calculado a partir de totalEpisodesWatched) */
  currentLevel?: number;
  /** Total de episodios vistos para calcular el nivel si no se pasa `currentLevel` */
  totalEpisodesWatched?: number;
  /** Logros especiales de Supabase (`public.user_achievements`) */
  achievements?: UserAchievementRow[];
}

export function TrophyShowcase({
  currentLevel,
  totalEpisodesWatched = 5428,
  achievements = [],
}: TrophyShowcaseProps): React.JSX.Element {
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyMilestone | null>(null);

  const resolvedLevel = useMemo<number>(() => {
    if (typeof currentLevel === 'number' && currentLevel > 0) {
      return currentLevel;
    }
    return calculateLevel(totalEpisodesWatched).computedLevel;
  }, [currentLevel, totalEpisodesWatched]);

  const unlockedCount = useMemo<number>(
    () => TROPHY_CONFIG.filter((t) => resolvedLevel >= t.level).length,
    [resolvedLevel]
  );

  const monthlyWins = useMemo<UserAchievementRow[]>(
    () => achievements.filter((a) => a.achievement_type === 'monthly_winner'),
    [achievements]
  );

  return (
    <section aria-label="Vitrina de Trofeos y Marcos" className="bento-card p-6 sm:p-7 space-y-6">
      {/* Cabecera de la Vitrina */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kurama/15 border border-kurama/35 text-kurama shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              Vitrina de Trofeos &amp; Marcos
              <span className="rounded-full bg-kurama/20 border border-kurama/40 px-2.5 py-0.5 text-xs font-bold text-kurama">
                {unlockedCount} / {TROPHY_CONFIG.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sube de nivel viendo episodios para desbloquear títulos legendarios y marcos de perfil exclusivos.
            </p>
          </div>
        </div>

        {/* Insignia de Campeonatos Mensuales si posee alguno */}
        {monthlyWins.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-400/40 px-4 py-2.5 shrink-0">
            <Crown className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Campeón de Liga Mensual
              </p>
              <p className="text-[11px] text-amber-100/80">
                {monthlyWins.length}{' '}
                {monthlyWins.length === 1
                  ? 'temporada ganada'
                  : 'temporadas ganadas'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid de los 10 Trofeos de Nivel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {TROPHY_CONFIG.map((milestone, idx) => {
          const isUnlocked = resolvedLevel >= milestone.level;
          const levelsRemaining = Math.max(0, milestone.level - resolvedLevel);
          const progressToUnlock = Math.min(
            100,
            Math.round((resolvedLevel / milestone.level) * 100)
          );

          return (
            <motion.button
              key={milestone.level}
              type="button"
              onClick={() => setSelectedTrophy(milestone)}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              whileHover={{ y: -4 }}
              className={cn(
                'group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-300',
                isUnlocked
                  ? 'border-kurama/40 bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[0_8px_25px_rgba(0,0,0,0.35)] hover:border-kurama'
                  : 'border-white/[0.06] bg-slate-950/40 opacity-65 hover:opacity-95 hover:border-white/15'
              )}
            >
              {/* Fila superior: Nivel requerido + Estado */}
              <div className="flex items-center justify-between w-full gap-2">
                <span
                  className={cn(
                    'rounded-lg px-2 py-0.5 font-display text-xs font-extrabold',
                    isUnlocked
                      ? 'bg-kurama text-slate-950'
                      : 'bg-white/[0.07] text-muted-foreground'
                  )}
                >
                  NV. {milestone.level}
                </span>

                {isUnlocked ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </div>

              {/* Icono Central con Anillo de Marco */}
              <div className="my-4 flex items-center justify-center">
                <div
                  className={cn(
                    'relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
                    isUnlocked
                      ? milestone.frameName
                        ? FRAME_STYLES[milestone.frameName].ringClass
                        : 'ring-2 ring-kurama/50 bg-kurama/10'
                      : 'bg-white/[0.03] border border-white/[0.08]'
                  )}
                  style={
                    isUnlocked
                      ? {
                          boxShadow: `0 0 22px ${milestone.accentHex}40`,
                        }
                      : undefined
                  }
                >
                  <Trophy
                    className="h-6 w-6"
                    style={{
                      color: isUnlocked ? milestone.accentHex : '#64748b',
                    }}
                  />
                </div>
              </div>

              {/* Título y Marco */}
              <div className="space-y-1 w-full">
                <p
                  className={cn(
                    'font-display text-xs sm:text-sm font-bold leading-tight truncate',
                    isUnlocked ? 'text-white' : 'text-slate-400'
                  )}
                >
                  {milestone.title}
                </p>

                {milestone.frameName ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold',
                      isUnlocked ? 'text-kurama' : 'text-muted-foreground'
                    )}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {milestone.frameLabel}
                  </span>
                ) : (
                  <span className="block text-[10px] text-muted-foreground">
                    Título de honor
                  </span>
                )}

                {/* Mini barra de progreso si está bloqueado */}
                {!isUnlocked && (
                  <div className="pt-1.5 space-y-1">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-slate-600"
                        style={{ width: `${progressToUnlock}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Faltan {levelsRemaining} niv.
                    </p>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Modal / Tarjeta de Detalle del Trofeo Seleccionado */}
      <AnimatePresence>
        {selectedTrophy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTrophy(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bento-card relative w-full max-w-md p-6 space-y-4 border-kurama/40"
            >
              <button
                type="button"
                onClick={() => setSelectedTrophy(null)}
                aria-label="Cerrar detalle de trofeo"
                className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl bg-background shrink-0',
                    selectedTrophy.frameName
                      ? FRAME_STYLES[selectedTrophy.frameName].ringClass
                      : 'ring-2 ring-kurama/50'
                  )}
                >
                  <Trophy
                    className="h-8 w-8"
                    style={{ color: selectedTrophy.accentHex }}
                  />
                </div>
                <div>
                  <span className="rounded-full bg-kurama/20 border border-kurama/40 px-2.5 py-0.5 text-[11px] font-bold text-kurama">
                    Hito de Nivel {selectedTrophy.level}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-extrabold text-white">
                    {selectedTrophy.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedTrophy.frameLabel}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {selectedTrophy.description}
              </p>

              <div className="flex items-center justify-between rounded-xl bg-background/70 border border-white/[0.07] p-3 text-xs">
                <span className="text-muted-foreground">Estado en tu cuenta:</span>
                {resolvedLevel >= selectedTrophy.level ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    ¡Desbloqueado! (Nivel actual: {resolvedLevel})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                    <Lock className="h-3.5 w-3.5" />
                    Te faltan {selectedTrophy.level - resolvedLevel} niveles
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
