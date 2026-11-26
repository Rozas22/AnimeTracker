import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { LigaDetailView } from '@/components/ligas/LigaDetailView';
import { getLeagueDetail } from '@/lib/ligas/server';
import { getVerifiedAniListId } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Liga privada',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function LigaPage({ params }: { params: { id: string } }): Promise<React.JSX.Element> {
  const me = await getVerifiedAniListId();
  if (!me) redirect('/entrar');
  const league = await getLeagueDetail(me, params.id);
  if (!league) notFound();
  return <LigaDetailView key={league.id} initial={league} />;
}
