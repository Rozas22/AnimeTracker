/** Tipos de las ligas privadas compartidos entre servidor y navegador. */

export const LEAGUE_LIMITS = { owned: 5, joined: 20, members: 50, nameMin: 3, nameMax: 40 } as const;

export interface LeagueSummary {
  id: string;
  name: string;
  isOwner: boolean;
  members: number;
}

export interface LeagueRow {
  /** Clave solo para pintar la lista */
  key: string;
  /** Nombre visible: nunca el de un perfil no público */
  name: string;
  score: number;
  plays: number;
  place: number;
  isMe: boolean;
  isOwner: boolean;
  /** Solo la recibe quien creó la liga, para poder expulsar */
  memberKey: string | null;
}

export interface LeagueDetail {
  id: string;
  name: string;
  code: string;
  isOwner: boolean;
  members: number;
  week: LeagueRow[];
  month: LeagueRow[];
}

export interface InvitePreview {
  id: string;
  name: string;
  members: number;
  status: 'open' | 'member' | 'blocked' | 'full';
}

export type LeagueResult<T> = { ok: true; data: T } | { ok: false; error: string };
