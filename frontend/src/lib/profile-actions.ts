'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getVerifiedAniListId } from '@/lib/session-server';
import type { UserAchievementRow, UserProfileRow } from '@/types/database';

/**
 * Perfil propio aunque no sea público: con la clave pública solo se leen los
 * perfiles públicos. Devuelve datos únicamente a su dueño verificado.
 */
export async function getOwnProfileAction(
  anilistId: number
): Promise<{ profile: UserProfileRow; achievements: UserAchievementRow[] } | null> {
  const verifiedId = await getVerifiedAniListId();
  if (!verifiedId || verifiedId !== Math.trunc(anilistId)) return null;

  const supabase = createAdminClient();
  const [{ data: profile }, { data: achievements }] = await Promise.all([
    supabase.from('users').select('*').eq('anilist_id', verifiedId).maybeSingle(),
    supabase
      .from('user_achievements')
      .select('*')
      .eq('anilist_id', verifiedId)
      .order('awarded_at', { ascending: false }),
  ]);

  return profile ? { profile, achievements: achievements ?? [] } : null;
}
