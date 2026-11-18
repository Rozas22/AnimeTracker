import React, { Suspense } from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import {
  getWeeklyAiringScheduleAction,
  getUserAnimeCollectionAction,
} from '@/lib/anilist/actions';
import { ProfileBillboard } from '@/components/wall/ProfileBillboard';
import { StatsStrip } from '@/components/wall/StatsStrip';
import { HomeWall } from '@/components/wall/HomeWall';
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

function emptyAniListUser(id: number, name?: string | null): AniListUser {
  return {
    id,
    name: name ?? 'Tu perfil',
    about: null,
    avatar: { large: null, medium: null },
    bannerImage: null,
    siteUrl: `https://anilist.co/user/${id}`,
    updatedAt: Math.floor(Date.now() / 1000),
    statistics: {
      anime: { count: 0, meanScore: 0, standardDeviation: 0, minutesWatched: 0, episodesWatched: 0, statuses: [], genres: [] },
    },
  };
}

async function DashboardContent(): Promise<React.JSX.Element> {
  const [authData, airingResult] = await Promise.all([
    getServerAuthenticatedUser(),
    getWeeklyAiringScheduleAction(),
  ]);

  const collectionResult = await getUserAnimeCollectionAction({
    userId: authData.anilistId,
  });

  // Los datos de ejemplo solo se usan en desarrollo local; en producción, si AniList
  // no responde, se muestra el perfil del usuario con las estadísticas a cero.
  const isDev = process.env.NODE_ENV !== 'production';
  const anilistUser =
    authData.anilistViewer ??
    (isDev ? MOCK_ANILIST_USER : emptyAniListUser(authData.anilistId, authData.profile?.username));
  const supabaseProfile = authData.profile ?? (isDev ? MOCK_SUPABASE_PROFILE : null);
  const achievements =
    authData.achievements.length > 0 ? authData.achievements : isDev ? MOCK_ACHIEVEMENTS : [];

  // ÚNICA FUENTE DE VERDAD del nivel y episodios vistos
  const unifiedEpisodes = authData.unifiedLevel.totalEpisodesWatched;
  const unifiedLevelNumber = authData.unifiedLevel.computedLevel;

  const entries = collectionResult.data ?? [];
  const featured =
    entries
      .filter((e) => (e.status === 'CURRENT' || e.status === 'REPEATING') && e.media.bannerImage)
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null;

  return (
    <div className="space-y-8">
      <ProfileBillboard
        anilistUser={anilistUser}
        initialProfile={supabaseProfile}
        initialAchievements={achievements}
        totalEpisodesWatched={unifiedEpisodes}
        backdropUrl={featured?.media.bannerImage ?? anilistUser.bannerImage}
        backdropTitle={featured ? featured.media.title.userPreferred : null}
        footer={<StatsStrip variant="figures" statistics={anilistUser.statistics.anime} entries={entries} />}
      />

      <HomeWall
        entries={entries}
        schedules={airingResult.data ?? []}
        anilistUserId={authData.anilistId ?? anilistUser.id}
        afterFirstRow={<StatsStrip statistics={anilistUser.statistics.anime} entries={entries} />}
      />

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
