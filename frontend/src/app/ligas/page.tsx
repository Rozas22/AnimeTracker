import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LigasHome } from '@/components/ligas/LigasHome';
import { listMyLeagues } from '@/lib/ligas/server';
import { getVerifiedAniListId } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ligas privadas', robots: { index: false, follow: false } };

export default async function LigasPage(): Promise<React.JSX.Element> {
  const me = await getVerifiedAniListId();
  if (!me) redirect('/entrar');
  return <LigasHome leagues={await listMyLeagues(me)} />;
}
