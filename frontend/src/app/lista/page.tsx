import React, { Suspense } from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { getUserAnimeCollectionAction } from '@/lib/anilist/actions';
import { MyListClientView } from '@/components/anime/MyListClientView';
import { AnimeGridSkeleton } from '@/components/anime/AnimeCard';
import type { MediaListEntry } from '@/types/anilist';

const FALLBACK_ENTRIES: MediaListEntry[] = [
  {
    id: 1,
    mediaId: 171018,
    status: 'CURRENT',
    score: 9.2,
    progress: 7,
    repeat: 0,
    priority: 0,
    private: false,
    notes: null,
    startedAt: null,
    completedAt: null,
    updatedAt: null,
    createdAt: null,
    media: {
      id: 171018,
      idMal: 57334,
      title: {
        romaji: 'Dandadan',
        english: 'DAN DA DAN',
        native: 'ダンダダン',
        userPreferred: 'DAN DA DAN',
      },
      format: 'TV',
      status: 'RELEASING',
      description:
        'Momo Ayase y Okarun se ven envueltos en una batalla paranormal contra espíritus y alienígenas.',
      startDate: null,
      endDate: null,
      season: 'FALL',
      seasonYear: 2024,
      episodes: 12,
      duration: 24,
      coverImage: {
        extraLarge: '/icon-512.png',
        large: '/icon-512.png',
        medium: '/icon-192.png',
        color: '#f59e0b',
      },
      bannerImage: null,
      genres: ['Action', 'Comedy', 'Sci-Fi', 'Supernatural'],
      synonyms: [],
      averageScore: 87,
      meanScore: 87,
      popularity: 180000,
      favourites: 15000,
      isAdult: false,
      nextAiringEpisode: {
        id: 101,
        airingAt: Math.floor(Date.now() / 1000) + 86400,
        timeUntilAiring: 86400,
        episode: 8,
      },
      externalLinks: [
        {
          id: 1,
          url: 'https://www.crunchyroll.com',
          site: 'Crunchyroll',
          siteId: 1,
          type: 'STREAMING',
          language: 'es',
          color: '#f47521',
          icon: null,
          isDisabled: false,
        },
      ],
      siteUrl: 'https://anilist.co/anime/171018',
    },
  },
];

async function ListaServerLoader(): Promise<React.JSX.Element> {
  const authUser = await getServerAuthenticatedUser();
  const targetUserId = authUser?.anilistId ?? 7952169;
  const targetUserName = authUser?.profile?.username ?? 'Rozas22';

  const result = await getUserAnimeCollectionAction({
    userId: targetUserId,
    userName: targetUserName,
  });

  const entries =
    result.data && result.data.length > 0 ? result.data : FALLBACK_ENTRIES;

  return (
    <MyListClientView
      initialEntries={entries}
      anilistUserId={targetUserId}
    />
  );
}

export default function MiListaPage(): React.JSX.Element {
  return (
    <Suspense fallback={<AnimeGridSkeleton count={12} />}>
      <ListaServerLoader />
    </Suspense>
  );
}
