import React from 'react';
import { getServerAuthenticatedUser } from '@/lib/auth';
import { SettingsClientView } from '@/components/settings/SettingsClientView';

const DEFAULT_AVATAR_URL =
  'https://s4.anilist.co/file/anilistcdn/user/avatar/large/b7952169-aN2k8haFFNOq.png';

export default async function AjustesPage(): Promise<React.JSX.Element> {
  const authUser = await getServerAuthenticatedUser();

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
    <SettingsClientView
      anilistId={authUser.anilistId}
      username={username}
      avatarUrl={avatarUrl}
      siteUrl={siteUrl}
      initialProfile={authUser.profile}
      initialUnifiedLevel={authUser.unifiedLevel}
    />
  );
}
