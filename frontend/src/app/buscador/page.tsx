import React, { Suspense } from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { searchAnimeCatalogAction } from '@/lib/anilist/actions';
import { SearchCatalogView } from '@/components/anime/SearchCatalogView';
import { AnimeGridSkeleton } from '@/components/anime/AnimeCard';

async function BuscadorServerLoader(): Promise<React.JSX.Element> {
  const [authUser, catalogResult] = await Promise.all([
    getServerAuthenticatedUser(),
    searchAnimeCatalogAction({
      page: 1,
      perPage: 18,
      sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
    }),
  ]);

  return (
    <SearchCatalogView
      initialMedia={catalogResult.data?.media ?? []}
      initialHasNextPage={catalogResult.data?.pageInfo.hasNextPage ?? true}
      anilistUserId={authUser?.anilistId ?? 7952169}
    />
  );
}

export default function BuscadorPage(): React.JSX.Element {
  return (
    <Suspense fallback={<AnimeGridSkeleton count={18} />}>
      <BuscadorServerLoader />
    </Suspense>
  );
}
