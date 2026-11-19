/** Tipos del Reto diario compartidos entre servidor y navegador (sin respuestas). */

export type RoundType = 'cover' | 'hints' | 'character' | 'score';

export interface RetoOption {
  id: number;
  title: string;
  /** Título original (romaji) si difiere del mostrado */
  alt?: string | null;
}

export interface ScorePairPublic {
  a: { id: number; title: string; cover: string };
  b: { id: number; title: string; cover: string };
}

export interface PublicRound {
  type: RoundType;
  /** Nombre corto para la interfaz */
  label: string;
  /** Segundos que dura la ronda */
  limit: number;
  options?: RetoOption[];
  pairs?: ScorePairPublic[];
}

export interface RoundResult {
  correct: boolean;
  points: number;
  /** Respuesta correcta revelada al terminar la ronda */
  answer?: RetoOption | null;
  /** Lo que eligió el jugador */
  picked?: number | null;
  /** Ronda de notas: aciertos por pareja y notas reales */
  pairs?: Array<{ picked: 'a' | 'b' | null; correct: boolean; scores: [number, number] }>;
  /** Ronda de personaje: nombre revelado */
  character?: string | null;
}

export interface RetoState {
  day: string;
  rounds: PublicRound[];
  /** null = aún no ha empezado */
  play: {
    score: number;
    results: RoundResult[];
    finished: boolean;
    /** Ronda en curso: ms transcurridos según el servidor */
    current: { index: number; elapsedMs: number; hints: string[]; pairIndex: number; pairResults: RoundResult['pairs'] } | null;
  } | null;
}

export interface RetoRankingRow {
  anilistId: number;
  username: string;
  score: number;
  plays?: number;
  isMe: boolean;
  place: number;
}

/** Duración de cada tipo de ronda (s) y escalones de pixelado de portada. */
export const ROUND_LIMITS: Record<RoundType, number> = { cover: 20, hints: 20, character: 12, score: 30 };
export const PIXEL_STEPS = [8, 12, 18, 28, 44, 70] as const;
export const PIXEL_STEP_SECONDS = 3;
export const HINT_STEP_SECONDS = 4;
export const SCORE_PAIRS = 5;
export const MAX_SCORE = 1000;
