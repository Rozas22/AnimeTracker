'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Flame,
  Sparkles,
  Trophy,
  Crown,
  Zap,
  ChevronRight,
  Shield,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  calculateLevel,
  calculatePL,
  getLeagueInfo,
  FRAME_STYLES,
  TROPHY_CONFIG,
  type FrameType,
} from '@/lib/league';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import type { AniListUser } from '@/types/anilist';
import type { UserProfileRow, UserAchievementRow } from '@/types/database';

export interface ProfileHeroBentoProps {
  /** Usuario de AniList (opcional; si no se pasa se usa fallback o estado local) */
  anilistUser?: AniListUser | null;
  /** Fila de `public.users` (opcional; si no se pasa la obtiene `useSupabaseUser`) */
  initialProfile?: UserProfileRow | null;
  /** Logros de `public.user_achievements` */
  initialAchievements?: UserAchievementRow[];
  /** Episodios totales vistos (sobrescribe el cálculo si se pasa explícitamente) */
  totalEpisodesWatched?: number;
}

const FALLBACK_USER: Pick<AniListUser, 'id' | 'name' | 'avatar' | 'bannerImage'> = {
  id: 7952169,
  name: 'Rozas22',
  avatar: {
    large: '/logo.png',
    medium: '/logo.png',
  },
  bannerImage: null,
};

export function ProfileHeroBento({
  anilistUser,
  initialProfile,
  initialAchievements,
  totalEpisodesWatched,
}: ProfileHeroBentoProps): React.JSX.Element {
  const {
    profile: hookProfile,
    achievements: hookAchievements,
    isLoading,
  } = useSupabaseUser(anilistUser?.id ?? initialProfile?.anilist_id);

  const activeProfile = initialProfile ?? hookProfile;
  const activeAchievements = initialAchievements ?? hookAchievements;

  // Selector de marco activo ('auto' usa el más alto desbloqueado por nivel)
  const [selectedFrameMode, setSelectedFrameMode] = useState<FrameType | 'auto'>('auto');

  // Cálculo de episodios totales: prioridad prop -> AniList stats -> anime_points / 10 -> demo
  const resolvedEpisodes = useMemo<number>(() => {
    if (typeof totalEpisodesWatched === 'number') return totalEpisodesWatched;
    if (anilistUser?.statistics?.anime?.episodesWatched !== undefined) {
      return anilistUser.statistics.anime.episodesWatched;
    }
    if (activeProfile?.anime_points !== undefined && activeProfile.anime_points > 0) {
      return Math.floor(activeProfile.anime_points / 10);
    }
    return 1420; // Valor de demostración visual inicial si aún no ha sincronizado
  }, [totalEpisodesWatched, anilistUser, activeProfile]);

  const quizPoints = activeProfile?.quiz_points ?? 0;
  const monthlyQuizPoints = activeProfile?.monthly_quiz_points ?? 0;
  const currentStreak = activeProfile?.current_streak ?? 0;

  // Cálculos matemáticos del motor de progresión y liga
  const levelData = useMemo(
    () => calculateLevel(resolvedEpisodes),
    [resolvedEpisodes]
  );

  const totalGlobalPL = useMemo(
    () => calculatePL(resolvedEpisodes, quizPoints),
    [resolvedEpisodes, quizPoints]
  );

  const leagueInfo = useMemo(
    () => getLeagueInfo(totalGlobalPL),
    [totalGlobalPL]
  );

  // Progreso hacia la siguiente división de Liga
  const leagueDivisionProgress = useMemo<number>(() => {
    if (!leagueInfo.nextThresholdPL) return 100;
    const span = leagueInfo.nextThresholdPL - leagueInfo.minPL;
    const currentInTier = totalGlobalPL - leagueInfo.minPL;
    return Math.min(100, Math.max(0, Number(((currentInTier / span) * 100).toFixed(1))));
  }, [leagueInfo, totalGlobalPL]);

  // Marco visual aplicado al Avatar
  const effectiveFrame: FrameType =
    selectedFrameMode === 'auto' ? levelData.unlockedFrame : selectedFrameMode;
  const frameStyle = FRAME_STYLES[effectiveFrame];

  // Marcos desbloqueados hasta el nivel actual para el selector rápido
  const unlockedFramesList = useMemo<FrameType[]>(() => {
    const frames: FrameType[] = ['none'];
    for (const milestone of TROPHY_CONFIG) {
      if (
        milestone.frameName &&
        levelData.computedLevel >= milestone.level &&
        !frames.includes(milestone.frameName)
      ) {
        frames.push(milestone.frameName);
      }
    }
    return frames;
  }, [levelData.computedLevel]);

  // Contabilizar coronas de campeón mensual
  const monthlyCrownsCount = useMemo<number>(
    () =>
      activeAchievements.filter((ach) => ach.achievement_type === 'monthly_winner')
        .length,
    [activeAchievements]
  );

  const displayName =
    anilistUser?.name ?? activeProfile?.username ?? FALLBACK_USER.name;
  const avatarUrl =
    anilistUser?.avatar?.large ??
    anilistUser?.avatar?.medium ??
    FALLBACK_USER.avatar.large ??
    '/logo.png';
  const bannerUrl = anilistUser?.bannerImage ?? null;

  return (
    <section
      aria-label="Resumen de Perfil y Nivel"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full"
    >
      {/* ═══════════════════════════════════════════════════════════════════
          BENTO PRINCIPAL (8 COLUMNAS): IDENTIDAD, MARCO, NIVEL Y BARRA DE XP
         ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="bento-card relative lg:col-span-8 overflow-hidden p-6 sm:p-8 flex flex-col justify-between"
      >
        {/* Banner atmosférico o resplandor radial de fondo */}
        {bannerUrl ? (
          <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
            <Image
              src={bannerUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-transparent" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-kurama/15 blur-3xl"
          />
        )}

        {/* Fila Superior: Avatar con Marco + Identidad + Selector de Marco */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Contenedor del Avatar con Marco de Rango */}
            <div className="relative shrink-0 group">
              <div
                className={cn(
                  'relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-background transition-all duration-500',
                  frameStyle.ringClass,
                  frameStyle.glowClass
                )}
              >
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  sizes="112px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>

              {/* Píldora flotante del Nivel actual */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 320 }}
                className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-kurama-500 to-amber-600 px-3 py-0.5 text-xs font-extrabold tracking-wide text-slate-950 shadow-lg border border-amber-200/60"
              >
                NV. {levelData.computedLevel}
              </motion.div>
            </div>

            {/* Datos de Identidad y Títulos */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    frameStyle.badgeClass
                  )}
                >
                  <Award className="h-3.5 w-3.5" />
                  {levelData.userTitle}
                </span>

                {monthlyCrownsCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    {monthlyCrownsCount}{' '}
                    {monthlyCrownsCount === 1 ? 'Corona Mensual' : 'Coronas Mensuales'}
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white truncate">
                {displayName}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                <span>
                  <strong className="text-white font-semibold">
                    {resolvedEpisodes.toLocaleString('es-ES')}
                  </strong>{' '}
                  episodios vistos
                </span>
                <span className="text-white/20">•</span>
                <span className="text-kurama font-medium">
                  {frameStyle.label}
                </span>
              </p>
            </div>
          </div>

          {/* Selector rápido de Marcos Desbloqueados */}
          {unlockedFramesList.length > 1 && (
            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Marco de Avatar
              </span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-background/60 p-1.5 border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setSelectedFrameMode('auto')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                    selectedFrameMode === 'auto'
                      ? 'bg-kurama text-slate-950 shadow-sm'
                      : 'text-muted-foreground hover:text-white'
                  )}
                >
                  Auto
                </button>
                {unlockedFramesList.map((frameKey) => (
                  <button
                    key={frameKey}
                    type="button"
                    onClick={() => setSelectedFrameMode(frameKey)}
                    className={cn(
                      'rounded-lg px-2 py-1 text-xs font-medium capitalize transition-all',
                      selectedFrameMode === frameKey
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-muted-foreground hover:text-white'
                    )}
                    title={FRAME_STYLES[frameKey].label}
                  >
                    {frameKey === 'none' ? 'Base' : frameKey}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── BARRA DE PROGRESO DE EXPERIENCIA ANIMADA (Framer Motion) ─── */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/[0.07] space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Progreso hacia el Nivel {levelData.computedLevel + 1}
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-white">
                  {levelData.progressPercentage}%
                </span>
                <span className="text-xs text-muted-foreground">
                  ({levelData.currentLevelEpisodes} / {levelData.episodesForNextLevel} ep.
                  en este nivel)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 text-xs font-medium text-slate-200">
                <Zap className="h-3.5 w-3.5 text-kurama" />
                Faltan{' '}
                <strong className="text-kurama font-bold">
                  {levelData.episodesRemainingToNextLevel}
                </strong>{' '}
                ep.
              </span>
            </div>
          </div>

          {/* Pista de la Barra de Experiencia */}
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-950/90 p-0.5 border border-white/[0.08] shadow-inner">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${levelData.progressPercentage}%` }}
              transition={{
                duration: 1.15,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.15,
              }}
              className="relative h-full rounded-full bg-gradient-to-r from-kurama-600 via-kurama-500 to-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.65)]"
            >
              {/* Efecto brillo interno */}
              <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)] bg-[length:200%_100%]" />
            </motion.div>
          </div>

          {/* Próximo Hito de Trofeo / Marco */}
          {levelData.nextMilestone && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-kurama" />
                Próxima recompensa al{' '}
                <strong className="text-slate-200">
                  Nivel {levelData.nextMilestone.level}
                </strong>
                : {levelData.nextMilestone.title}{' '}
                {levelData.nextMilestone.frameName &&
                  `(${levelData.nextMilestone.frameLabel})`}
              </span>
              {isLoading && (
                <span className="text-[11px] text-kurama animate-pulse">
                  Sincronizando...
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUMNA LATERAL DERECHA (4 COLUMNAS): LIGA GLOBAL Y RACHA MENSUAL
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        {/* Sub-Card 1: Rango de Liga Global (PL) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          className={cn(
            'bento-card relative overflow-hidden p-5 flex-1 flex flex-col justify-between border',
            leagueInfo.borderColor,
            leagueInfo.glowColor
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-kurama" />
                División de Liga Global
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl">{leagueInfo.icon}</span>
                <h2
                  className={cn(
                    'font-display text-2xl font-extrabold tracking-tight',
                    leagueInfo.textColor
                  )}
                >
                  Liga {leagueInfo.name}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <span className="font-display text-xl font-extrabold text-white">
                {totalGlobalPL.toLocaleString('es-ES')}
              </span>
              <span className="ml-1 text-xs font-bold text-kurama">PL</span>
              <p className="text-[10px] text-muted-foreground">Puntos Globales</p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Progreso de división</span>
              {leagueInfo.nextThresholdPL ? (
                <span>
                  Meta:{' '}
                  <strong className="text-slate-200">
                    {leagueInfo.nextThresholdPL.toLocaleString('es-ES')} PL
                  </strong>
                </span>
              ) : (
                <span className="text-cyan-300 font-semibold">
                  ¡Rango Máximo Alcanzado!
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950/80 border border-white/[0.06]">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${leagueDivisionProgress}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full bg-gradient-to-r',
                  leagueInfo.badgeGradient
                )}
              />
            </div>
          </div>
        </motion.div>

        {/* Sub-Card 2: Temporada Mensual + Racha de Quiz Diario */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: 'easeOut' }}
          className="bento-card p-5 flex-1 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kurama/15 border border-kurama/30 text-kurama">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quiz del Mes
                </span>
                <p className="font-display text-xl font-extrabold text-white">
                  {monthlyQuizPoints.toLocaleString('es-ES')}{' '}
                  <span className="text-xs font-bold text-kurama">PL</span>
                </p>
              </div>
            </div>

            {/* Indicador de Racha Diaria */}
            <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/30 px-3 py-2">
              <Flame className="h-5 w-5 text-orange-400 fill-orange-400/30" />
              <div className="text-right">
                <p className="font-display text-base font-extrabold leading-none text-orange-300">
                  {currentStreak}d
                </p>
                <p className="text-[10px] font-medium text-orange-200/70">Racha</p>
              </div>
            </div>
          </div>

          <Link
            href="/arena"
            className="mt-4 group flex items-center justify-between rounded-xl bg-gradient-to-r from-kurama-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:brightness-110"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Jugar Quiz Diario y sumar PL
            </span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
