import React from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { SettingsClientView } from '@/components/settings/SettingsClientView';
import { AdminPrizePanel } from '@/components/settings/AdminPrizePanel';
import { isVerifiedAdmin } from '@/lib/session-server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_AVATAR_URL =
  'https://s4.anilist.co/file/anilistcdn/user/avatar/large/b7952169-aN2k8haFFNOq.png';

export default async function AjustesPage(): Promise<React.JSX.Element> {
  const [authUser, isAdmin] = await Promise.all([getServerAuthenticatedUser(), isVerifiedAdmin()]);

  // Premio del mes en curso para el panel de administración
  let currentPrize = null;
  if (isAdmin) {
    const now = new Date();
    const { data } = await createClient()
      .from('monthly_prizes')
      .select('*')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .maybeSingle();
    currentPrize = data ?? null;
  }

  const username =
    authUser.anilistViewer?.name ??
    authUser.profile?.username ??
    'Rozas22';

  const avatarUrl =
    authUser.anilistViewer?.avatar?.large ||
    authUser.anilistViewer?.avatar?.medium ||
    DEFAULT_AVATAR_URL;

  const siteUrl =
    authUser.anilistViewer?.siteUrl ??
    `https://anilist.co/user/${username}`;

  return (
    <div className="space-y-8">
    <SettingsClientView
      anilistId={authUser.anilistId}
      username={username}
      avatarUrl={avatarUrl}
      siteUrl={siteUrl}
      initialProfile={authUser.profile}
      initialUnifiedLevel={authUser.unifiedLevel}
    />
    {isAdmin && <AdminPrizePanel initialPrize={currentPrize} />}
    </div>
  );
}
