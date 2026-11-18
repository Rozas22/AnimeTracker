import React from 'react';
import { createClient } from '@/lib/supabase/server';
import {
  GroupRealtimeView,
  type ActivityFeedItem,
} from '@/components/social/GroupRealtimeView';
import type { UserProfileRow } from '@/types/database';

const FALLBACK_MEMBERS: UserProfileRow[] = [
  {
    anilist_id: 7952169,
    username: 'Rozas22',
    quiz_points: 16400,
    monthly_quiz_points: 4780,
    anime_points: 15800,
    level: 38,
    current_streak: 9,
    profile_visibility: 'public',
    last_updated_at: new Date().toISOString(),
  },
];

export default async function GrupoPage(): Promise<React.JSX.Element> {
  const supabase = createClient();

  const { data: usersData } = await supabase
    .from('users')
    .select('*')
    .order('monthly_quiz_points', { ascending: false })
    .limit(50);

  const members =
    usersData && usersData.length > 0 ? usersData : FALLBACK_MEMBERS;

  const initialFeed: ActivityFeedItem[] = members.slice(0, 8).map((u, idx) => ({
    id: `init-feed-${u.anilist_id}-${idx}`,
    username: u.username ?? `Usuario #${u.anilist_id}`,
    anilistId: u.anilist_id,
    actionText:
      u.monthly_quiz_points > 0
        ? `acumula ${u.monthly_quiz_points.toLocaleString('es-ES')} PL en la Liga Mensual (Nivel ${u.level || 1})`
        : `ha sincronizado su colección de AniList (Nivel ${u.level || 1})`,
    timestamp: u.last_updated_at
      ? new Date(u.last_updated_at).toLocaleDateString('es-ES')
      : 'Reciente',
  }));

  return (
    <GroupRealtimeView
      initialMembers={members}
      initialFeed={initialFeed}
    />
  );
}
