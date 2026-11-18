import React, { Suspense } from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { ProfileHeroBento } from '@/components/dashboard/ProfileHeroBento';
import { StatsBentoGrid } from '@/components/dashboard/StatsBentoGrid';
import { AiringScheduleBento } from '@/components/dashboard/AiringScheduleBento';
import { TrophyShowcase } from '@/components/dashboard/TrophyShowcase';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import type { AniListUser } from '@/types/anilist';
import type { UserProfileRow, UserAchievementRow } from '@/types/database';

const MOCK_ANILIST_USER: AniListUser = {
  id: 7952169,
  name: 'Rozas22',
  about:
    'Amante del anime shonen, seinen y fantasía oscura. Compitiendo en la Liga de KuramaTracker.',
  avatar: {
    large: '/logo.png',
    medium: '/logo.png',
  },
  bannerImage: null,
  siteUrl: 'https://anilist.co/user/Rozas22',
  updatedAt: Math.floor(Date.now() / 1000),
  statistics: {
    anime: {
      count: 124,
      meanScore: 85.4,
      standardDeviation: 10.8,
      minutesWatched: 37920,
      episodesWatched: 1580,
      statuses: [
        { status: 'CURRENT', count: 8, meanScore: 86, minutesWatched: 2400, episodesWatched: 100 },
        { status: 'COMPLETED', count: 89, meanScore: 85, minutesWatched: 33600, episodesWatched: 1400 },
        { status: 'PLANNING', count: 19, meanScore: 0, minutesWatched: 0, episodesWatched: 0 },
        { status: 'PAUSED', count: 5, meanScore: 79, minutesWatched: 1200, episodesWatched: 50 },
        { status: 'DROPPED', count: 3, meanScore: 62, minutesWatched: 720, episodesWatched: 30 },
      ],
      genres: [
        { genre: 'Action', count: 74, meanScore: 87, minutesWatched: 21000, episodesWatched: 875 },
        { genre: 'Fantasy', count: 58, meanScore: 86, minutesWatched: 16800, episodesWatched: 700 },
        { genre: 'Supernatural', count: 44, meanScore: 88, minutesWatched: 12000, episodesWatched: 500 },
        { genre: 'Adventure', count: 39, meanScore: 85, minutesWatched: 11400, episodesWatched: 475 },
        { genre: 'Thriller', count: 27, meanScore: 89, minutesWatched: 7200, episodesWatched: 300 },
      ],
    },
  },
};

const MOCK_SUPABASE_PROFILE: UserProfileRow = {
  anilist_id: 7952169,
  username: 'Rozas22',
  quiz_points: 16400,
  monthly_quiz_points: 4780,
  anime_points: 15800,
  level: 38,
  current_streak: 9,
  profile_visibility: 'public',
  last_updated_at: new Date().toISOString(),
};

const MOCK_ACHIEVEMENTS: UserAchievementRow[] = [
  {
    id: 'demo-ach-1',
    anilist_id: 7952169,
    achievement_type: 'monthly_winner',
    awarded_at: new Date().toISOString(),
  },
];

async function DashboardContent(): Promise<React.JSX.Element> {
  const authData = await getServerAuthenticatedUser();

  const anilistUser = authData?.anilistViewer ?? MOCK_ANILIST_USER;
  const supabaseProfile = authData?.profile ?? MOCK_SUPABASE_PROFILE;
  const achievements =
    authData && authData.achievements.length > 0
      ? authData.achievements
      : MOCK_ACHIEVEMENTS;

  const episodesWatched =
    anilistUser.statistics?.anime?.episodesWatched ??
    Math.floor((supabaseProfile.anime_points || 15800) / 10);

  return (
    <div className="space-y-7">
      <ProfileHeroBento
        anilistUser={anilistUser}
        initialProfile={supabaseProfile}
        initialAchievements={achievements}
        totalEpisodesWatched={episodesWatched}
      />

      <StatsBentoGrid statistics={anilistUser.statistics.anime} />

      <AiringScheduleBento />

      <TrophyShowcase
        totalEpisodesWatched={episodesWatched}
        achievements={achievements}
      />
    </div>
  );
}

export default function DashboardPage(): React.JSX.Element {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
