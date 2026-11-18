'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Radio,
  Flame,
  Trophy,
  Sparkles,
  Search,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  calculateLevel,
  calculatePL,
  getLeagueInfo,
  FRAME_STYLES,
} from '@/lib/league';
import type { UserProfileRow } from '@/types/database';

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
  const [members, setMembers] = useState<UserProfileRow[]>(initialMembers);
  const [feed, setFeed] = useState<ActivityFeedItem[]>(initialFeed);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  // Suscripción Supabase Realtime a cambios en `public.users`
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('kurama-social-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          if (!payload.new || typeof payload.new !== 'object' || !('anilist_id' in payload.new)) {
            return;
          }

          const updatedUser = payload.new as UserProfileRow;

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
            actionText: `ha actualizado su progreso (Nivel ${updatedUser.level} • ${updatedUser.monthly_quiz_points} PL este mes)`,
            timestamp: 'Ahora mismo',
          };

          setFeed((prev) => [newFeedEvent, ...prev.slice(0, 19)]);
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

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
    <div className="space-y-6">
      {/* Cabecera de El Grupo */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/35 text-purple-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-2.5">
              El Grupo &amp; Comunidad
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                  isRealtimeConnected
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-kurama/15 border-kurama/40 text-kurama'
                )}
              >
                <Radio className="h-3 w-3 animate-pulse" />
                {isRealtimeConnected ? 'Realtime Activo' : 'Sincronizado'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sigue el nivel, marcos y actividad en directo de tus amigos en KuramaTracker.
            </p>
          </div>
        </div>

        {/* Buscador de Amigos */}
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar amigo por nombre..."
            className="w-full rounded-xl bg-background/80 border border-white/15 pl-9 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-kurama"
          />
        </div>
      </div>

      {/* Layout Principal: Directorio de Miembros (8 cols) + Activity Feed Realtime (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Directorio de Amigos */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          {filteredMembers.map((member, idx) => {
            const episodes = Math.floor((member.anime_points || 0) / 10);
            const levelData = calculateLevel(episodes);
            const totalPL = calculatePL(episodes, member.quiz_points || 0);
            const league = getLeagueInfo(totalPL);
            const frame = FRAME_STYLES[levelData.unlockedFrame];
            const name = member.username ?? `Usuario #${member.anilist_id}`;

            return (
              <motion.div
                key={member.anilist_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="bento-card p-4 flex flex-col justify-between gap-4 hover:border-kurama/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-display text-sm font-extrabold text-kurama',
                        frame.ringClass
                      )}
                    >
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base font-extrabold text-white truncate">
                        {name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-bold text-kurama">
                          Nv. {member.level || levelData.computedLevel}
                        </span>
                        <span>•</span>
                        <span className="truncate">{levelData.userTitle}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
                      league.borderColor,
                      league.textColor
                    )}
                  >
                    {league.icon} {league.name}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-background/60 p-2.5 border border-white/[0.06] text-center">
                  <div>
                    <p className="font-display text-sm font-extrabold text-white">
                      {totalPL.toLocaleString('es-ES')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">PL Global</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-extrabold text-kurama">
                      {(member.monthly_quiz_points || 0).toLocaleString('es-ES')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">PL Mes</p>
                  </div>
                  <div>
                    <p className="font-display text-sm font-extrabold text-orange-300 flex items-center justify-center gap-0.5">
                      <Flame className="h-3.5 w-3.5 text-orange-400" />
                      {member.current_streak || 0}d
                    </p>
                    <p className="text-[10px] text-muted-foreground">Racha</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Columna Lateral: Activity Feed en Tiempo Real */}
        <div className="lg:col-span-4">
          <div className="bento-card p-5 space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-kurama" />
                <h2 className="font-display text-base font-extrabold text-white">
                  Activity Feed en Vivo
                </h2>
              </div>
              <Sparkles className="h-4 w-4 text-kurama" />
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {feed.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-white/[0.07] bg-background/60 p-3 space-y-1"
                  >
                    <p className="text-xs text-slate-200 leading-relaxed">
                      <strong className="text-kurama font-bold">
                        {item.username}
                      </strong>{' '}
                      {item.actionText}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-400" />
                      {item.timestamp}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
