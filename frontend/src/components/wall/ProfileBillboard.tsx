'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, Flame, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  resolveUnifiedUserLevel,
  calculatePL,
  getLeagueInfo,
  FRAME_STYLES,
  TROPHY_CONFIG,
  resolveDisplayFrame,
  type FrameType,
} from '@/lib/league';
import { saveSelectedFrame } from '@/lib/frames/saveFrame';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { AnimeFrame } from '@/components/frames/AnimeFrame';
import type { AniListUser } from '@/types/anilist';
import type { UserProfileRow, UserAchievementRow } from '@/types/database';

export interface ProfileBillboardProps {
  anilistUser: AniListUser;
  initialProfile?: UserProfileRow | null;
  initialAchievements?: UserAchievementRow[];
  totalEpisodesWatched?: number;
  /** Imagen de fondo: banner del anime destacado o del usuario */
  backdropUrl?: string | null;
  /** Título del anime cuyo banner hace de fondo (para el pie de crédito) */
  backdropTitle?: string | null;
  /** Base de la cabecera (cifras principales), visible desde sm */
  footer?: React.ReactNode;
}

const nf = new Intl.NumberFormat('es-ES');

/**
 * Cabecera "billboard" del Muro: quién eres en la liga, sobre el banner del
 * anime que estás viendo. Toda la lógica de nivel sale de `@/lib/league`.
 */
export function ProfileBillboard({
  anilistUser,
  initialProfile,
  initialAchievements,
  totalEpisodesWatched,
  backdropUrl,
  backdropTitle,
  footer,
}: ProfileBillboardProps): React.JSX.Element {
  const { profile: hookProfile, achievements: hookAchievements } = useSupabaseUser(
    anilistUser.id ?? initialProfile?.anilist_id
  );
  const profile = hookProfile ?? initialProfile ?? null;
  const achievements =
    hookAchievements.length > 0 ? hookAchievements : (initialAchievements ?? []);

  const [frameMode, setFrameMode] = useState<FrameType | 'auto'>(
    (profile?.selected_frame as FrameType | null | undefined) ?? 'auto'
  );
  const [frameMsg, setFrameMsg] = useState<string | null>(null);
  const [isSavingFrame, startFrameSave] = useTransition();

  // Cuando llega el perfil (o cambia en tiempo real), refleja el marco guardado
  useEffect(() => {
    setFrameMode((profile?.selected_frame as FrameType | null | undefined) ?? 'auto');
  }, [profile?.selected_frame]);

  const saveFrame = (value: FrameType | 'auto'): void => {
    const previous = frameMode;
    setFrameMode(value);
    setFrameMsg(null);
    startFrameSave(async () => {
      const res = await saveSelectedFrame(anilistUser.id, value === 'auto' ? null : value);
      if (!res.success) {
        setFrameMode(previous);
        setFrameMsg(res.error ?? 'No se pudo guardar el marco.');
      } else {
        setFrameMsg('Guardado');
      }
    });
  };
  const [avatarError, setAvatarError] = useState(false);

  const level = useMemo(
    () =>
      resolveUnifiedUserLevel({
        anilistEpisodesWatched:
          totalEpisodesWatched ?? anilistUser.statistics?.anime?.episodesWatched,
        supabaseAnimePoints: profile?.anime_points,
        supabaseStoredLevel: profile?.level,
      }),
    [totalEpisodesWatched, anilistUser, profile]
  );

  const quizPoints = profile?.quiz_points ?? 0;
  const monthlyQuizPoints = profile?.monthly_quiz_points ?? 0;
  const streak = profile?.current_streak ?? 0;
  const totalPL = calculatePL(level.totalEpisodesWatched, quizPoints);
  const league = getLeagueInfo(totalPL);
  const leagueProgress = league.nextThresholdPL
    ? Math.min(100, ((totalPL - league.minPL) / (league.nextThresholdPL - league.minPL)) * 100)
    : 100;

  const effectiveFrame: FrameType =
    frameMode === 'auto' ? level.unlockedFrame : resolveDisplayFrame(level.computedLevel, frameMode);
  const frameStyle = FRAME_STYLES[effectiveFrame];
  const unlockedFrames = useMemo<FrameType[]>(() => {
    const list: FrameType[] = ['none'];
    for (const m of TROPHY_CONFIG) {
      if (m.frameName && level.computedLevel >= m.level && !list.includes(m.frameName)) {
        list.push(m.frameName);
      }
    }
    return list;
  }, [level.computedLevel]);

  const crowns = achievements.filter((a) => a.achievement_type === 'monthly_winner').length;
  const avatarUrl =
    avatarError || !(anilistUser.avatar.large || anilistUser.avatar.medium)
      ? '/logo.png'
      : (anilistUser.avatar.large || anilistUser.avatar.medium)!;
  const backdrop = backdropUrl ?? anilistUser.bannerImage ?? null;

  return (
    <section
      aria-label="Tu perfil y tu liga"
      className="relative isolate rounded-[18px] bg-card"
      style={{ boxShadow: 'var(--shadow-lift)' }}
    >
      {/* Fondo: banner del anime destacado, apagado y desenfocado */}
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-[18px]">
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover object-[center_30%] blur-md"
            unoptimized={backdrop.startsWith('http')}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e14]/90 via-[#0c0e14]/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14]/90 via-transparent to-transparent" />
        </div>
      )}

      <div className="grid gap-6 p-5 sm:gap-8 sm:p-8 lg:grid-cols-[1fr_minmax(300px,380px)] lg:items-end lg:p-10">
        {/* Identidad y nivel */}
        <div className="min-w-0">
          <div className="flex flex-col items-center gap-12 pt-10 text-center sm:flex-row sm:gap-16 sm:pl-10 sm:pt-6 sm:text-left">
            <AnimeFrame frame={effectiveFrame} size={104} detail="full" label={frameStyle.label} showcase={{ title: anilistUser.name, subtitle: `Nv. ${level.computedLevel} · ${level.userTitle}` }}>
              <Image
                src={avatarUrl}
                alt={anilistUser.name}
                fill
                sizes="112px"
                className="object-cover"
                unoptimized={avatarUrl.startsWith('http')}
                onError={() => setAvatarError(true)}
                priority
              />
            </AnimeFrame>
            <div className="min-w-0">
              <h1 className="truncate font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {anilistUser.name}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/75 sm:justify-start">
                <span className="font-semibold text-white">{level.userTitle}</span>
                {crowns > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5 text-white/75" aria-hidden="true" />
                    {crowns} {crowns === 1 ? 'corona mensual' : 'coronas mensuales'}
                  </span>
                )}
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-[#ff8a3d]" aria-hidden="true" />
                    Racha de {streak} {streak === 1 ? 'día' : 'días'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 max-w-xl sm:mt-7">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-2xl font-bold text-white tabular">
                Nv. {level.computedLevel}
              </p>
              <p className="text-sm text-white/75 tabular">
                {level.episodesRemainingToNextLevel > 0
                  ? `Faltan ${nf.format(level.episodesRemainingToNextLevel)} ep. para el Nv. ${level.computedLevel + 1}`
                  : 'Nivel máximo'}
              </p>
            </div>
            <div
              className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Progreso hacia el siguiente nivel"
              aria-valuenow={Math.round(level.progressPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-kurama transition-[width] duration-700"
                style={{ width: `${level.progressPercentage}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
              <span className="tabular">
                {nf.format(level.currentLevelEpisodes)} / {nf.format(level.episodesForNextLevel)} ep. en este nivel
                {level.nextMilestone && ` · Nv. ${level.nextMilestone.level}: ${level.nextMilestone.frameLabel}`}
              </span>
              <label className="hidden items-center gap-2 sm:inline-flex">
                <span>Marco</span>
                <select
                  value={frameMode}
                  onChange={(e) => saveFrame(e.target.value as FrameType | 'auto')}
                  disabled={isSavingFrame}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white focus:border-kurama focus:outline-none"
                >
                  <option value="auto">Automático</option>
                  {unlockedFrames.map((f) => (
                    <option key={f} value={f}>
                      {FRAME_STYLES[f].label}
                    </option>
                  ))}
                </select>
                {frameMsg && (
                  <span role="status" className={frameMsg === 'Guardado' ? 'text-white/70' : 'text-[#ff6b81]'}>
                    {frameMsg}
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Liga y quiz */}
        <div className="rounded-[14px] bg-[#0c0e14]/80 p-4 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Liga {league.name}</p>
            <p className="text-sm text-muted-foreground tabular">
              {nf.format(monthlyQuizPoints)} PL de quiz este mes
            </p>
          </div>
          <p className="mt-1 font-display text-3xl font-bold text-white tabular sm:text-4xl">
            {nf.format(totalPL)} <span className="text-xl font-semibold text-muted-foreground">PL</span>
          </p>
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Progreso hacia la siguiente liga"
            aria-valuenow={Math.round(leagueProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-white/80" style={{ width: `${leagueProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground tabular">
            {league.nextThresholdPL
              ? `${nf.format(league.nextThresholdPL - totalPL)} PL para subir de liga`
              : 'Estás en la liga más alta'}
          </p>
          <Link
            href="/arena"
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-[10px] bg-kurama font-semibold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Jugar quiz diario
          </Link>
        </div>
      </div>

      {footer && (
        <div className="hidden border-t border-white/10 px-5 pb-8 pt-6 sm:block sm:px-8 lg:px-10">{footer}</div>
      )}

      {backdrop && backdropTitle && (
        <p className="absolute bottom-2 right-4 hidden text-[10px] text-white/40 sm:block">
          Fondo: {backdropTitle}
        </p>
      )}
    </section>
  );
}
