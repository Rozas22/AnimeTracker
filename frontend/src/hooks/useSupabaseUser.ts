'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOwnProfileAction } from '@/lib/profile-actions';
import type {
  UserProfileRow,
  UserAchievementRow,
  TablesUpdate,
} from '@/types/database';

const ADMIN_ANILIST_ID = Number(process.env.NEXT_PUBLIC_ADMIN_ANILIST_ID ?? 7952169);

export interface UseSupabaseUserReturn {
  profile: UserProfileRow | null;
  achievements: UserAchievementRow[];
  anilistId: number | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: TablesUpdate<'users'>) => Promise<UserProfileRow | null>;
}

/**
 * Custom Hook para obtener y suscribirse en tiempo real al perfil de KuramaTracker
 * en la tabla `public.users` y sus medallas en `public.user_achievements`.
 */
export function useSupabaseUser(explicitAniListId?: number | null): UseSupabaseUserReturn {
  const hookInstanceId = useId().replace(/:/g, '');
  const [anilistId, setAnilistId] = useState<number | null>(explicitAniListId ?? null);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [achievements, setAchievements] = useState<UserAchievementRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Resolver anilist_id desde props, Supabase Auth o almacenamiento local de sesión OAuth
  useEffect(() => {
    if (explicitAniListId && explicitAniListId > 0) {
      setAnilistId(explicitAniListId);
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    async function resolveIdentity(): Promise<void> {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const metaId = user?.user_metadata?.['anilist_id'] as
          | number
          | string
          | undefined;

        if (metaId && !Number.isNaN(Number(metaId))) {
          if (isMounted) setAnilistId(Number(metaId));
          return;
        }

        if (typeof window !== 'undefined') {
          const cachedUserRaw =
            window.localStorage.getItem('kuramaTrackerUser') ||
            window.localStorage.getItem('animeTrackerUser');

          if (cachedUserRaw) {
            const parsed = JSON.parse(cachedUserRaw) as { id?: number | string };
            if (parsed.id && !Number.isNaN(Number(parsed.id))) {
              if (isMounted) setAnilistId(Number(parsed.id));
              return;
            }
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error resolviendo sesión');
          setIsLoading(false);
        }
      }
    }

    void resolveIdentity();

    return () => {
      isMounted = false;
    };
  }, [explicitAniListId]);

  const fetchUserData = useCallback(async (targetId: number): Promise<void> => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const [userResult, achievementsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('anilist_id', targetId)
          .maybeSingle(),
        supabase
          .from('user_achievements')
          .select('*')
          .eq('anilist_id', targetId)
          .order('awarded_at', { ascending: false }),
      ]);

      if (userResult.error) {
        throw new Error(userResult.error.message);
      }

      // Un perfil no público no se lee con la clave pública: su dueño lo pide al servidor
      const own = userResult.data ? null : await getOwnProfileAction(targetId);
      setProfile(userResult.data ?? own?.profile ?? null);
      setAchievements(own?.achievements ?? achievementsResult.data ?? []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar el perfil de Supabase'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos y abrir suscripción Realtime en `public.users`
  useEffect(() => {
    if (!anilistId) return;

    let isSubscribedMounted = true;
    void fetchUserData(anilistId);

    const supabase = createClient();
    // Canal único por instancia y montaje para evitar colisión en cliente singleton o React StrictMode
    const uniqueTopic = `user-profile-${anilistId}-${hookInstanceId}-${Date.now()}`;

    const channel = supabase
      .channel(uniqueTopic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `anilist_id=eq.${anilistId}`,
        },
        (payload) => {
          if (
            isSubscribedMounted &&
            payload.new &&
            typeof payload.new === 'object' &&
            'anilist_id' in payload.new
          ) {
            setProfile(payload.new as UserProfileRow);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribedMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [anilistId, hookInstanceId, fetchUserData]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!anilistId) return;
    await fetchUserData(anilistId);
  }, [anilistId, fetchUserData]);

  const updateProfile = useCallback(
    async (updates: TablesUpdate<'users'>): Promise<UserProfileRow | null> => {
      if (!anilistId) return null;

      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          ...updates,
          last_updated_at: new Date().toISOString(),
        })
        .eq('anilist_id', anilistId)
        .select('*')
        .single();

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      setProfile(data);
      return data;
    },
    [anilistId]
  );

  return {
    profile,
    achievements,
    anilistId,
    isAdmin: anilistId === ADMIN_ANILIST_ID,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
  };
}
