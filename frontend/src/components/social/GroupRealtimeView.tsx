'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Medal, Search, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimeFrame } from '@/components/frames/AnimeFrame';
import { createClient } from '@/lib/supabase/client';
import {
  resolveUnifiedUserLevel,
  calculatePL,
  getLeagueInfo,
  FRAME_STYLES,
  resolveDisplayFrame,
} from '@/lib/league';
import type { UserProfileRow } from '@/types/database';

/** Color del icono de medalla por división (solo el icono, nunca el texto). */
const TIER_COLOR: Record<string, string> = {
  bronze: '#c08457',
  silver: '#c9cfdb',
  gold: '#e3b341',
  diamond: '#7cc8f0',
};

export interface ActivityFeedItem {
  id: string;
  username: string;
  anilistId: number;
  actionText: string;
  pointsDelta?: number;
  timestamp: string;
}

export interface GroupRealtimeViewProps {
  initialMembers: UserProfileRow[];
  initialFeed: ActivityFeedItem[];
}

export function GroupRealtimeView({
  initialMembers,
  initialFeed,
}: GroupRealtimeViewProps): React.JSX.Element {
  const instanceId = useId().replace(/:/g, '');
  const [members, setMembers] = useState<UserProfileRow[]>(initialMembers);
  const [feed, setFeed] = useState<ActivityFeedItem[]>(initialFeed);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Suscripción Supabase Realtime a cambios en `public.users`
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    const uniqueChannelName = `kurama-social-activity-feed-${instanceId}-${Date.now()}`;

    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          if (
            !isMounted ||
            !payload.new ||
            typeof payload.new !== 'object' ||
            !('anilist_id' in payload.new)
          ) {
            return;
          }

          const updatedUser = payload.new as UserProfileRow;
          const unified = resolveUnifiedUserLevel({
            supabaseAnimePoints: updatedUser.anime_points,
            supabaseStoredLevel: updatedUser.level,
          });

          setMembers((prev) => {
            const exists = prev.some((m) => m.anilist_id === updatedUser.anilist_id);
            if (!exists) return [updatedUser, ...prev];
            return prev.map((m) =>
              m.anilist_id === updatedUser.anilist_id ? updatedUser : m
            );
          });

          const newFeedEvent: ActivityFeedItem = {
            id: `rt-${updatedUser.anilist_id}-${Date.now()}`,
            username: updatedUser.username ?? `Usuario #${updatedUser.anilist_id}`,
            anilistId: updatedUser.anilist_id,
            actionText: `ha actualizado su progreso (Nivel ${unified.computedLevel} • ${updatedUser.monthly_quiz_points} PL este mes)`,
            timestamp: 'Ahora mismo',
          };

          setFeed((prev) => [newFeedEvent, ...prev.slice(0, 19)]);
        }
      )
      .subscribe((status) => {
        if (isMounted) {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        }
      });

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [instanceId]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members
      .filter((m) => {
        if (m.profile_visibility === 'private') return false;
        if (!q) return true;
        return (
          (m.username ?? '').toLowerCase().includes(q) ||
          String(m.anilist_id).includes(q)
        );
      })
      .sort((a, b) => {
        const plA = (a.anime_points || 0) + (a.quiz_points || 0);
        const plB = (b.anime_points || 0) + (b.quiz_points || 0);
        return plB - plA;
      });
  }, [members, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Cabecera de El Grupo */}
      <section className="flex flex-col gap-5 rounded-[18px] bg-card p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8" style={{ boxShadow: 'var(--shadow-tile)' }}>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">El Grupo</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>El nivel, la liga y la racha de quienes juegan contigo.</span>
            <span className="inline-flex items-center gap-1.5 text-white">
              <span
                className={cn('h-2 w-2 rounded-full', isRealtimeConnected ? 'bg-kurama' : 'bg-muted-foreground')}
                aria-hidden="true"
              />
              {isRealtimeConnected ? 'En directo' : 'Sincronizado'}
            </span>
          </p>
        </div>

        <label className="relative block sm:w-72">
          <span className="sr-only">Buscar en el grupo</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre"
            className="h-11 w-full rounded-[10px] border border-white/10 bg-background pl-10 pr-3 text-sm text-white placeholder:text-muted-foreground focus:border-kurama focus:outline-none"
          />
        </label>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* Miembros */}
        <section aria-label="Miembros del grupo">
          {filteredMembers.length === 0 ? (
            <p className="rounded-[14px] bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              Nadie del grupo coincide con «{searchQuery}».
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredMembers.map((member, idx) => {
                const levelData = resolveUnifiedUserLevel({
                  supabaseAnimePoints: member.anime_points,
                  supabaseStoredLevel: member.level,
                });
                const episodes = levelData.totalEpisodesWatched;
                const totalPL = calculatePL(episodes, member.quiz_points || 0);
                const league = getLeagueInfo(totalPL);
                const frame = FRAME_STYLES[levelData.unlockedFrame];
                const name = member.username ?? `Usuario #${member.anilist_id}`;

                return (
                  <motion.li
                    key={member.anilist_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx, 10) * 0.03 }}
                    className="rounded-[14px] bg-card p-5 transition-transform duration-300 hover:-translate-y-0.5"
                    style={{ boxShadow: 'var(--shadow-tile)' }}
                  >
                    <div className="flex items-center gap-3.5">
                      <AnimeFrame frame={resolveDisplayFrame(levelData.computedLevel, member.selected_frame)} size={48} label={frame.label}>
                        <span className="grid h-full w-full place-items-center bg-[#252a36] text-sm font-semibold text-white">
                          {name.slice(0, 2).toUpperCase()}
                        </span>
                      </AnimeFrame>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold text-white">{name}</p>
                        <p className="truncate text-xs text-muted-foreground tabular">
                          Nv. {levelData.computedLevel} · {levelData.userTitle}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Medal className="h-4 w-4" style={{ color: TIER_COLOR[league.id] }} aria-hidden="true" />
                        {league.name}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                      <div>
                        <dt className="text-xs text-muted-foreground">PL total</dt>
                        <dd className="mt-0.5 font-display text-base font-semibold text-white tabular">{totalPL.toLocaleString('es-ES')}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Este mes</dt>
                        <dd className="mt-0.5 font-display text-base font-semibold text-white tabular">
                          {(member.monthly_quiz_points || 0).toLocaleString('es-ES')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Racha</dt>
                        <dd className="mt-0.5 flex items-center gap-1 font-display text-base font-semibold text-white tabular">
                          <Flame className={cn('h-4 w-4', (member.current_streak || 0) > 0 ? 'text-[#ff8a3d]' : 'text-muted-foreground')} aria-hidden="true" />
                          {member.current_streak || 0} d
                        </dd>
                      </div>
                    </dl>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Actividad */}
        <aside aria-labelledby="feed-title" className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[14px] bg-card p-5" style={{ boxShadow: 'var(--shadow-tile)' }}>
            <h2 id="feed-title" className="flex items-center gap-2 font-display text-base font-semibold text-white">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Actividad reciente
            </h2>
            {feed.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Aún no hay actividad.</p>
            ) : (
              <ol className="mt-3 max-h-[520px] divide-y divide-white/[0.06] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {feed.map((item) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="py-3"
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <strong className="font-semibold text-white">{item.username}</strong> {item.actionText}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground/80 tabular">{item.timestamp}</p>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
