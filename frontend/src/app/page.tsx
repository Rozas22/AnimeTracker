import React, { Suspense } from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { ProfileHeroBento } from '@/components/dashboard/ProfileHeroBento';
import { StatsBentoGrid } from '@/components/dashboard/StatsBentoGrid';
import { AiringScheduleBento } from '@/components/dashboard/AiringScheduleBento';
import { TrophyShowcase } from '@/components/dashboard/TrophyShowcase';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import type { AniListUser } from '@/types/anilist';
import type { UserProfileRow, UserAchievementRow } from '@/types/database';

const REAL_AVATAR_URL =
  'https://s4.anilist.co/file/anilistcdn/user/avatar/large/b7952169-aN2k8haFFNOq.png';

const MOCK_ANILIST_USER: AniListUser = {
  id: 7952169,
  name: 'Rozas22',
  about:
    'Amante del anime shonen, seinen y fantasía oscura. Compitiendo en la Liga de KuramaTracker.',
  avatar: {
    large: REAL_AVATAR_URL,
    medium: REAL_AVATAR_URL,
  },
  bannerImage: null,
  siteUrl: 'https://anilist.co/user/Rozas22',
  updatedAt: Math.floor(Date.now() / 1000),
  statistics: {
    anime: {
      count: 176,
      meanScore: 89.6,
      standardDeviation: 10.2,
      minutesWatched: 130511,
      episodesWatched: 5428,
      statuses: [
        { status: 'CURRENT', count: 8, meanScore: 88, minutesWatched: 2400, episodesWatched: 100 },
        { status: 'COMPLETED', count: 141, meanScore: 90, minutesWatched: 126000, episodesWatched: 5248 },
        { status: 'PLANNING', count: 19, meanScore: 0, minutesWatched: 0, episodesWatched: 0 },
        { status: 'PAUSED', count: 5, meanScore: 79, minutesWatched: 1200, episodesWatched: 50 },
        { status: 'DROPPED', count: 3, meanScore: 62, minutesWatched: 911, episodesWatched: 30 },
      ],
      genres: [
        { genre: 'Action', count: 98, meanScore: 90, minutesWatched: 68000, episodesWatched: 2800 },
        { genre: 'Fantasy', count: 76, meanScore: 89, minutesWatched: 52000, episodesWatched: 2150 },
        { genre: 'Supernatural', count: 62, meanScore: 90, minutesWatched: 41000, episodesWatched: 1700 },
        { genre: 'Adventure', count: 54, meanScore: 88, minutesWatched: 38000, episodesWatched: 1580 },
        { genre: 'Drama', count: 42, meanScore: 91, minutesWatched: 26000, episodesWatched: 1080 },
      ],
    },
  },
};

const MOCK_SUPABASE_PROFILE: UserProfileRow = {
  anilist_id: 7952169,
  username: 'Rozas22',
  quiz_points: 4900,
  monthly_quiz_points: 0,
  anime_points: 54280,
  level: 50,
  current_streak: 0,
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

  const anilistUser = authData.anilistViewer ?? MOCK_ANILIST_USER;
  const supabaseProfile = authData.profile ?? MOCK_SUPABASE_PROFILE;
  const achievements =
    authData.achievements.length > 0 ? authData.achievements : MOCK_ACHIEVEMENTS;

  // ÚNICA FUENTE DE VERDAD del nivel y episodios vistos
  const unifiedEpisodes = authData.unifiedLevel.totalEpisodesWatched;
  const unifiedLevelNumber = authData.unifiedLevel.computedLevel;

  return (
    <div className="space-y-7">
      <ProfileHeroBento
        anilistUser={anilistUser}
        initialProfile={supabaseProfile}
        initialAchievements={achievements}
        totalEpisodesWatched={unifiedEpisodes}
      />

      <StatsBentoGrid statistics={anilistUser.statistics.anime} />

      <AiringScheduleBento />

      <TrophyShowcase
        currentLevel={unifiedLevelNumber}
        totalEpisodesWatched={unifiedEpisodes}
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
