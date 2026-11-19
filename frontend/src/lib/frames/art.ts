import type { FrameType } from '@/lib/league';

/** Hueco central del marco, en fracciones de la imagen (medido sobre el original). */
export interface FrameOpening {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameArt {
  src: string;
  opening: FrameOpening;
  /** Nombre del efecto de animación propio del marco (ver globals.css) */
  fx: 'flame' | 'shine' | 'pulse' | 'hue' | 'twinkle';
  /**
   * Vídeo en bucle (Google Flow) con fondo negro, recortado al mismo encuadre que `src`.
   * Se funde con `screen`; con movimiento reducido se usa la imagen fija.
   */
  video?: string;
}

/**
 * Marcos ilustrados (generados con Gemini, originales en design-assets/originales).
 * El fondo negro original se convirtió en transparencia real (alfa = brillo).
 */
export const FRAME_ART: Partial<Record<FrameType, FrameArt>> = {
  bronze: { src: '/frames/bronce.webp', opening: { x: 0.228, y: 0.226, w: 0.543, h: 0.545 }, fx: 'shine' },
  silver: { src: '/frames/plata.webp', opening: { x: 0.246, y: 0.243, w: 0.508, h: 0.511 }, fx: 'shine' },
  gold: { src: '/frames/oro.webp', opening: { x: 0.275, y: 0.362, w: 0.45, h: 0.416 }, fx: 'flame', video: '/frames/oro-llamas.mp4' },
  ruby: { src: '/frames/rubi.webp', opening: { x: 0.274, y: 0.275, w: 0.451, h: 0.45 }, fx: 'pulse', video: '/frames/rubi-magia.mp4' },
  diamond: { src: '/frames/diamante.webp', opening: { x: 0.292, y: 0.292, w: 0.416, h: 0.417 }, fx: 'twinkle' },
  chroma: { src: '/frames/croma.webp', opening: { x: 0.33, y: 0.333, w: 0.34, h: 0.33 }, fx: 'hue' },
};

/** Emblemas de trofeo ilustrados por nivel de hito. */
export const TROPHY_ART: Record<number, string> = {
  10: '/trophies/nv10.webp',
  20: '/trophies/nv20.webp',
  30: '/trophies/nv30.webp',
  40: '/trophies/nv40.webp',
  50: '/trophies/nv50.webp',
  60: '/trophies/nv60.webp',
  70: '/trophies/nv70.webp',
  80: '/trophies/nv80.webp',
  90: '/trophies/nv90.webp',
  100: '/trophies/nv100.webp',
};
