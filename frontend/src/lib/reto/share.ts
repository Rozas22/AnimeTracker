import type { Metadata } from 'next';
import { MAX_SCORE, type RetoState, type RoundResult } from './types';

/** El reto #1 fue el del primer día publicado. */
const FIRST_CHALLENGE_DAY = '2026-11-19';
const DAY_MS = 86_400_000;

export const challengeNumber = (day: string): number =>
  Math.floor((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${FIRST_CHALLENGE_DAY}T00:00:00Z`)) / DAY_MS) + 1;

export const todayChallengeNumber = (): number => challengeNumber(new Date().toISOString().slice(0, 10));

/** Número de reto válido de la URL (de #1 a hoy), o null. */
export function parseChallengeNumber(raw: string | null | undefined): number | null {
  if (!raw || !/^[1-9]\d{0,5}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= todayChallengeNumber() ? n : null;
}

export type RoundMark = 'good' | 'partial' | 'miss' | 'none';

export function markOf(r: RoundResult | undefined): RoundMark {
  if (!r) return 'none';
  if (r.points >= 150) return 'good';
  return r.points > 0 ? 'partial' : 'miss';
}

const SQUARES: Record<RoundMark, string> = { good: '🟩', partial: '🟨', miss: '🟥', none: '⬛' };
export const squareOf = (r: RoundResult | undefined): string => SQUARES[markOf(r)];

/** Texto sin spoilers: solo número, aciertos por colores, puntuación y enlace. */
export function buildShareText(state: RetoState, origin: string): string {
  const play = state.play;
  const squares = state.rounds.map((_, i) => squareOf(play?.results[i])).join('');
  return `🦊 Reto diario #${state.number} · KuramaTracker\n${squares} ${play?.score ?? 0}/${MAX_SCORE}\n¿Me superas? ${origin}/reto/${state.number}`;
}

export function retoMetadata(n: number, canonical = `/reto/${n}`): Metadata {
  const title = `Reto diario #${n}`;
  const description = '5 rondas de anime: portadas, pistas, personajes y notas. Juega gratis y sin registrarte. ¿Me superas?';
  const image = `/reto/tarjeta?n=${n}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      siteName: 'KuramaTracker',
      url: canonical,
      title: `${title} · KuramaTracker`,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: `${title} de KuramaTracker` }],
    },
    twitter: { card: 'summary_large_image', title: `${title} · KuramaTracker`, description, images: [image] },
  };
}
