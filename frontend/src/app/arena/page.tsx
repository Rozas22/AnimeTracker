import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { ArenaClientView } from '@/components/arena/ArenaClientView';
import type { UserProfileRow, MonthlyWinnerRow } from '@/types/database';

const FALLBACK_USERS: UserProfileRow[] = [
  {
    anilist_id: 7952169,
    username: 'Rozas22',
    quiz_points: 4900,
    monthly_quiz_points: 0,
    anime_points: 54280,
    level: 50,
    current_streak: 0,
    profile_visibility: 'public',
    last_updated_at: new Date().toISOString(),
  },
];

const FALLBACK_WINNERS: MonthlyWinnerRow[] = [
  {
    id: 'winner-aug-2026',
    anilist_id: 7952169,
    username: 'Rozas22',
    avatar_url: null,
    month: 8,
    year: 2026,
    score: 4780,
    created_at: new Date().toISOString(),
  },
];

export default async function ArenaPage(): Promise<React.JSX.Element> {
  const supabase = createClient();
  const authUser = await getServerAuthenticatedUser();

  const [usersResult, winnersResult, prizeResult] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .order('monthly_quiz_points', { ascending: false })
      .limit(100),
    supabase
      .from('monthly_winners')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('monthly_prizes')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const users =
    usersResult.data && usersResult.data.length > 0
      ? usersResult.data
      : process.env.NODE_ENV !== 'production' ? FALLBACK_USERS : [];

  const winners =
    winnersResult.data && winnersResult.data.length > 0
      ? winnersResult.data
      : process.env.NODE_ENV !== 'production' ? FALLBACK_WINNERS : [];

  return (
    <ArenaClientView
      initialUsers={users}
      monthlyWinners={winners}
      activePrize={prizeResult.data ?? null}
      currentUserId={authUser?.anilistId ?? 7952169}
    />
  );
}
