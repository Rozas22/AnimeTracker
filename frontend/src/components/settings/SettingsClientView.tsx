'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import {
  Settings,
  RefreshCw,
  Shield,
  Eye,
  Bell,
  CheckCircle2,
  Database,
  Award,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FRAME_STYLES,
  TROPHY_CONFIG,
  calculatePL,
  getLeagueInfo,
  type FrameType,
  type UnifiedLevelSnapshot,
} from '@/lib/league';
import {
  syncAccountWithAniListAction,
  updateProfileVisibilityAction,
} from '@/lib/anilist/actions';
import { saveSelectedFrame } from '@/lib/frames/saveFrame';
import type { ProfileVisibility, UserProfileRow } from '@/types/database';

export interface SettingsClientViewProps {
  anilistId: number;
  username: string;
  avatarUrl: string;
  siteUrl: string;
  initialProfile: UserProfileRow | null;
  initialUnifiedLevel: UnifiedLevelSnapshot;
}

const VISIBILITY_OPTIONS: ReadonlyArray<{
  value: ProfileVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'public',
    label: 'Público (Recomendado)',
    description: 'Tu perfil, nivel y puntuación aparecen en El Grupo y en la Arena.',
  },
  {
    value: 'friends',
    label: 'Solo Amigos',
    description: 'Visible únicamente para tus amigos mutuos de AniList.',
  },
  {
    value: 'private',
    label: 'Privado',
    description: 'Oculta tu progreso del directorio público de El Grupo.',
  },
];

export function SettingsClientView({
  anilistId,
  username,
  avatarUrl,
  siteUrl,
  initialProfile,
  initialUnifiedLevel,
}: SettingsClientViewProps): React.JSX.Element {
  const [currentLevel, setCurrentLevel] = useState<number>(
    initialUnifiedLevel.computedLevel
  );
  const [episodesWatched, setEpisodesWatched] = useState<number>(
    initialUnifiedLevel.totalEpisodesWatched
  );
  const [animePoints, setAnimePoints] = useState<number>(
    initialUnifiedLevel.totalAnimePoints
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(
    initialProfile?.last_updated_at ?? new Date().toISOString()
  );

  const [visibility, setVisibility] = useState<ProfileVisibility>(
    (initialProfile?.profile_visibility as ProfileVisibility) || 'public'
  );
  const [selectedFrame, setSelectedFrameState] = useState<FrameType | 'auto'>(
    (initialProfile?.selected_frame as FrameType | null | undefined) ?? 'auto'
  );
  const [isSavingFrame, startFrameSave] = useTransition();
  const setSelectedFrame = (value: FrameType | 'auto'): void => {
    const previous = selectedFrame;
    setSelectedFrameState(value);
    setFeedbackMsg(null);
    startFrameSave(async () => {
      const res = await saveSelectedFrame(anilistId, value === 'auto' ? null : value);
      if (!res.success) {
        setSelectedFrameState(previous);
        setFeedbackMsg(res.error ?? 'No se pudo guardar el marco.');
      } else {
        setFeedbackMsg('Marco guardado en tu perfil.');
      }
    });
  };
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [isSyncing, startSyncTransition] = useTransition();
  const [isSavingVis, startVisTransition] = useTransition();

  const quizPoints = initialProfile?.quiz_points ?? 4900;
  const totalPL = calculatePL(episodesWatched, quizPoints);
  const leagueInfo = getLeagueInfo(totalPL);

  const effectiveFrame: FrameType =
    selectedFrame === 'auto' ? initialUnifiedLevel.unlockedFrame : selectedFrame;
  const frameStyle = FRAME_STYLES[effectiveFrame];

  const unlockedFrames: FrameType[] = [
    'none',
    ...TROPHY_CONFIG.filter(
      (t) => t.frameName !== null && currentLevel >= t.level
    ).map((t) => t.frameName!),
  ];

  const handleManualSync = (): void => {
    setFeedbackMsg(null);
    startSyncTransition(async () => {
      const res = await syncAccountWithAniListAction(anilistId);
      if (res.data) {
        setCurrentLevel(res.data.computedLevel);
        setEpisodesWatched(res.data.episodesWatched);
        setAnimePoints(res.data.animePoints);
        setLastSyncedAt(res.data.syncedAt);
        setFeedbackMsg(
          `¡Sincronización completada! Nivel ${res.data.computedLevel} (${res.data.episodesWatched.toLocaleString('es-ES')} episodios) unificado en Supabase.`
        );
      } else {
        setFeedbackMsg(res.error ?? 'Error al sincronizar.');
      }
    });
  };

  const handleVisibilityChange = (nextVis: ProfileVisibility): void => {
    setVisibility(nextVis);
    setFeedbackMsg(null);
    startVisTransition(async () => {
      const res = await updateProfileVisibilityAction({
        anilistUserId: anilistId,
        visibility: nextVis,
      });
      if (res.success) {
        setFeedbackMsg('Preferencia de visibilidad actualizada en Supabase.');
      } else {
        setFeedbackMsg(res.error ?? 'No se pudo actualizar la visibilidad.');
      }
    });
  };

  const safeAvatar = avatarError ? '/logo.png' : avatarUrl;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kurama/15 border border-kurama/35 text-kurama">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Ajustes de Cuenta &amp; Sincronización
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gestiona tu vinculación entre AniList y Supabase, visibilidad y apariencia de tu perfil.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSyncing}
          onClick={handleManualSync}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-xl bg-kurama px-5 py-3 text-xs font-bold text-slate-950 shadow-lg transition-all hover:brightness-110 shrink-0',
            isSyncing && 'opacity-70'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
          {isSyncing
            ? 'Sincronizando con AniList...'
            : 'Sincronizar AniList ↔ Supabase'}
        </button>
      </div>

      {/* Mensaje de confirmación */}
      {feedbackMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda (7 cols): Estado de Cuenta y Base de Datos */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card Estado de Cuenta */}
          <div className="bento-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-kurama" />
                <h2 className="font-display text-base font-bold text-white">
                  Estado de Sincronización (Fuente de Verdad Única)
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                Conectado
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'relative h-20 w-20 rounded-2xl overflow-hidden bg-slate-900 shrink-0',
                  frameStyle.ringClass
                )}
              >
                <Image
                  src={safeAvatar}
                  alt={username}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={safeAvatar.startsWith('http')}
                  onError={() => setAvatarError(true)}
                />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-bold text-white truncate">
                    {username}
                  </h3>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] hover:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300"
                  >
                    AniList #{anilistId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Última sincronización:{' '}
                  <strong className="text-slate-200">
                    {new Date(lastSyncedAt).toLocaleString('es-ES')}
                  </strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl bg-background/70 border border-white/[0.07] p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Nivel Unificado
                </p>
                <p className="mt-1 font-display text-xl font-bold text-kurama">
                  Nv. {currentLevel}
                </p>
              </div>
              <div className="rounded-xl bg-background/70 border border-white/[0.07] p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Episodios Vistos
                </p>
                <p className="mt-1 font-display text-xl font-bold text-white">
                  {episodesWatched.toLocaleString('es-ES')}
                </p>
              </div>
              <div className="rounded-xl bg-background/70 border border-white/[0.07] p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Anime Points
                </p>
                <p className="mt-1 font-display text-xl font-bold text-sky-300">
                  {animePoints.toLocaleString('es-ES')}
                </p>
              </div>
              <div className="rounded-xl bg-background/70 border border-white/[0.07] p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  División Global
                </p>
                <p className="mt-1 font-display text-base font-bold text-amber-300">
                  {leagueInfo.icon} {leagueInfo.name}
                </p>
              </div>
            </div>
          </div>

          {/* Card Visibilidad del Perfil */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/[0.07] pb-3.5">
              <Eye className="h-4 w-4 text-kurama" />
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Privacidad y Visibilidad en Supabase
                </h2>
                <p className="text-xs text-muted-foreground">
                  Controla quién puede ver tu progreso en El Grupo y los rankings.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {VISIBILITY_OPTIONS.map((option) => {
                const isSelected = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSavingVis}
                    onClick={() => handleVisibilityChange(option.value)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all',
                      isSelected
                        ? 'border-kurama bg-kurama/10'
                        : 'border-white/[0.08] bg-background/60 hover:border-white/20'
                    )}
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white">
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                        isSelected
                          ? 'border-kurama bg-kurama'
                          : 'border-white/30'
                      )}
                    >
                      {isSelected && (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha (5 cols): Marco de Avatar y Notificaciones */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bento-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/[0.07] pb-3.5">
              <Award className="h-4 w-4 text-kurama" />
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Marco de Avatar Desbloqueado
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tienes {unlockedFrames.length} estilos disponibles en Nivel {currentLevel}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedFrame('auto')}
                className={cn(
                  'rounded-xl border p-3 text-left text-xs font-bold transition-all',
                  selectedFrame === 'auto'
                    ? 'border-kurama bg-kurama/15 text-kurama'
                    : 'border-white/[0.08] bg-background/60 text-slate-300 hover:text-white'
                )}
              >
                Automático ({FRAME_STYLES[initialUnifiedLevel.unlockedFrame].label})
              </button>

              {unlockedFrames.map((frameKey) => (
                <button
                  key={frameKey}
                  type="button"
                  onClick={() => setSelectedFrame(frameKey)}
                  className={cn(
                    'rounded-xl border p-3 text-left text-xs font-bold transition-all',
                    selectedFrame === frameKey
                      ? 'border-kurama bg-kurama/15 text-kurama'
                      : 'border-white/[0.08] bg-background/60 text-slate-300 hover:text-white'
                  )}
                >
                  {FRAME_STYLES[frameKey].label}
                </button>
              ))}
            </div>
          </div>

          <div className="bento-card p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-emerald-400" />
              <h2 className="font-display text-base font-bold text-white">
                Notificaciones Push PWA
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Recibe avisos automáticos cuando un anime de tu lista de{' '}
              <strong className="text-slate-200">&quot;Planeado ver&quot;</strong>{' '}
              cambie su estado a en emisión (`RELEASING`) en AniList.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <Shield className="h-4 w-4" />
              <span>Service Worker v9 y Web Push activos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
