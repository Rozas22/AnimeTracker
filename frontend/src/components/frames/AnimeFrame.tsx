import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import type { FrameType } from '@/lib/league';

export interface AnimeFrameProps {
  frame: FrameType;
  /** Lado del avatar en px */
  size: number;
  children: React.ReactNode;
  /** 'auto': decoración completa desde 64px; por debajo solo el borde del marco */
  detail?: 'auto' | 'full' | 'compact';
  className?: string;
  /** Texto accesible del marco (p. ej. "Marco de Oro") */
  label?: string;
}

/**
 * Marcos de avatar "épicos" por nivel, en lenguaje anime:
 * bronce = viñeta de manga con trama · plata = corte de katana · oro = aura de llamas ·
 * rubí = círculo mágico · diamante = cristales · croma = las nueve colas del zorro.
 *
 * Geometría: viewBox 160×160, el avatar ocupa el cuadrado 30..130 (radio 22).
 * Las capas "back" se pintan detrás del avatar y las "front" encima del borde.
 */
export function AnimeFrame({
  frame,
  size,
  children,
  detail = 'auto',
  className,
  label,
}: AnimeFrameProps): React.JSX.Element {
  const uid = useId().replace(/:/g, '');
  const full = detail === 'full' || (detail === 'auto' && size >= 64);
  const radius = Math.round(size * 0.22);
  const overlay = size * 1.6;
  const offset = -size * 0.3;

  const svgBox: React.CSSProperties = {
    position: 'absolute',
    left: offset,
    top: offset,
    width: overlay,
    height: overlay,
    pointerEvents: 'none',
    overflow: 'visible',
  };

  return (
    <div
      className={cn('anime-frame relative shrink-0', `anime-frame--${frame}`, className)}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {full && <BackLayer frame={frame} uid={uid} style={svgBox} />}

      <div className="relative z-[1] h-full w-full overflow-hidden bg-popover" style={{ borderRadius: radius }}>
        {children}
      </div>

      <FrontLayer frame={frame} uid={uid} style={{ ...svgBox, zIndex: 2 }} full={full} />
    </div>
  );
}

/* ─────────────────────────────── Capas traseras ─────────────────────────────── */

function BackLayer({ frame, uid, style }: { frame: FrameType; uid: string; style: React.CSSProperties }): React.JSX.Element | null {
  if (frame === 'gold') {
    // Aura de poder: lenguas de fuego que asoman por arriba y los lados
    const flames: Array<[number, number, number, number]> = [
      // x base, altura, ancho, retardo
      [44, 34, 18, 0],
      [60, 46, 20, 0.35],
      [80, 56, 24, 0.15],
      [100, 46, 20, 0.5],
      [116, 34, 18, 0.25],
      [32, 24, 14, 0.6],
      [128, 24, 14, 0.1],
    ];
    return (
      <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
        <defs>
          <linearGradient id={`fl-${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff7a18" />
            <stop offset="0.55" stopColor="#ffc93c" />
            <stop offset="1" stopColor="#fff3b0" />
          </linearGradient>
        </defs>
        <g className="af-aura" fill={`url(#fl-${uid})`}>
          {flames.map(([x, h, w, d], i) => (
            <path
              key={i}
              className="af-flame"
              style={{ animationDelay: `${d}s`, transformOrigin: `${x}px 44px` }}
              d={`M${x - w / 2} 44 C ${x - w / 2} ${44 - h * 0.45}, ${x - w * 0.1} ${44 - h * 0.6}, ${x} ${44 - h} C ${x + w * 0.1} ${44 - h * 0.6}, ${x + w / 2} ${44 - h * 0.45}, ${x + w / 2} 44 Z`}
            />
          ))}
          {/* llamas laterales */}
          <path className="af-flame" style={{ animationDelay: '0.2s', transformOrigin: '30px 90px' }} d="M32 120 C 18 100, 14 80, 22 58 C 26 76, 30 86, 34 92 Z" />
          <path className="af-flame" style={{ animationDelay: '0.45s', transformOrigin: '130px 90px' }} d="M128 120 C 142 100, 146 80, 138 58 C 134 76, 130 86, 126 92 Z" />
        </g>
      </svg>
    );
  }

  if (frame === 'ruby') {
    // Círculo mágico giratorio con marcas geométricas
    const marks = Array.from({ length: 24 }, (_, i) => i * 15);
    const gems = Array.from({ length: 6 }, (_, i) => i * 60);
    return (
      <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
        <g className="af-spin" style={{ transformOrigin: '80px 80px' }} fill="none" stroke="#ff4d7d">
          <circle cx="80" cy="80" r="76" strokeWidth="1.5" opacity="0.9" />
          <circle cx="80" cy="80" r="70" strokeWidth="0.75" opacity="0.6" />
          {marks.map((a) => (
            <line
              key={a}
              x1="80"
              y1="4"
              x2="80"
              y2={a % 45 === 0 ? 14 : 9}
              strokeWidth={a % 45 === 0 ? 2 : 1}
              transform={`rotate(${a} 80 80)`}
            />
          ))}
          {gems.map((a) => (
            <path key={a} d="M80 1 L84 7 L80 13 L76 7 Z" fill="#ff4d7d" stroke="none" transform={`rotate(${a + 30} 80 80)`} />
          ))}
        </g>
        <g className="af-spin-rev" style={{ transformOrigin: '80px 80px' }} fill="none" stroke="#ffb3c7" opacity="0.7">
          <circle cx="80" cy="80" r="64" strokeWidth="0.75" strokeDasharray="2 6" />
        </g>
      </svg>
    );
  }

  if (frame === 'chroma') {
    // Las nueve colas del zorro abiertas en abanico detrás del avatar
    const tails = Array.from({ length: 9 }, (_, i) => -76 + i * 19);
    return (
      <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
        <defs>
          <linearGradient id={`tl-${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff6a2b" />
            <stop offset="0.55" stopColor="#ff4fd8" />
            <stop offset="0.85" stopColor="#ffd6f3" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <g className="af-tails" fill={`url(#tl-${uid})`}>
          {tails.map((a, i) => (
            <g key={a} transform={`rotate(${a} 80 96)`}>
              <path
                className="af-tail"
                style={{ animationDelay: `${(i % 3) * 0.4 + i * 0.07}s`, transformOrigin: '80px 96px' }}
                d="M80 100 C 66 82, 62 52, 70 26 C 74 12, 84 2, 98 -2 C 90 10, 88 22, 92 36 C 98 60, 94 82, 80 100 Z"
              />
            </g>
          ))}
        </g>
      </svg>
    );
  }

  return null;
}

/* ─────────────────────────────── Capas delanteras ───────────────────────────── */

function FrontLayer({
  frame,
  uid,
  style,
  full,
}: {
  frame: FrameType;
  uid: string;
  style: React.CSSProperties;
  full: boolean;
}): React.JSX.Element {
  const rect = { x: 30, y: 30, width: 100, height: 100, rx: 22 };

  switch (frame) {
    case 'bronze':
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <defs>
            <pattern id={`tone-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.1" fill="#c08457" />
            </pattern>
          </defs>
          {full && (
            <>
              {/* Trama de manga en dos esquinas */}
              <path d="M18 18 L64 18 L18 64 Z" fill={`url(#tone-${uid})`} opacity="0.9" />
              <path d="M142 142 L96 142 L142 96 Z" fill={`url(#tone-${uid})`} opacity="0.9" />
            </>
          )}
          {/* Borde de viñeta: tinta gruesa + filo de cobre */}
          <rect {...rect} fill="none" stroke="#07080b" strokeWidth={full ? 9 : 10} />
          <rect {...rect} fill="none" stroke="#c08457" strokeWidth={full ? 3 : 5} />
        </svg>
      );

    case 'silver':
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <defs>
            <linearGradient id={`st-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f4f6fa" />
              <stop offset="0.5" stopColor="#8b93a7" />
              <stop offset="1" stopColor="#e8ebf2" />
            </linearGradient>
          </defs>
          <rect {...rect} fill="none" stroke={`url(#st-${uid})`} strokeWidth={full ? 5 : 7} />
          {full && (
            <g className="af-slash">
              {/* Dos cortes de katana cruzando las esquinas */}
              <path d="M96 10 L152 66 L149 69 L94 13 Z" fill="#ffffff" />
              <path d="M104 6 L156 58 L154 59 L103 7 Z" fill="#c9cfdb" opacity="0.8" />
              <path d="M8 94 L66 152 L63 154 L6 97 Z" fill="#ffffff" />
            </g>
          )}
        </svg>
      );

    case 'gold':
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <defs>
            <linearGradient id={`gd-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff3b0" />
              <stop offset="0.45" stopColor="#e3b341" />
              <stop offset="1" stopColor="#a8741a" />
            </linearGradient>
          </defs>
          <rect {...rect} fill="none" stroke={`url(#gd-${uid})`} strokeWidth={full ? 6 : 8} />
        </svg>
      );

    case 'ruby':
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <defs>
            <linearGradient id={`rb-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffb3c7" />
              <stop offset="0.5" stopColor="#ff4d7d" />
              <stop offset="1" stopColor="#9e1240" />
            </linearGradient>
          </defs>
          <rect {...rect} fill="none" stroke={`url(#rb-${uid})`} strokeWidth={full ? 6 : 8} />
        </svg>
      );

    case 'diamond':
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <defs>
            <linearGradient id={`dm-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.5" stopColor="#7cc8f0" />
              <stop offset="1" stopColor="#2f7fb8" />
            </linearGradient>
          </defs>
          <rect {...rect} fill="none" stroke={`url(#dm-${uid})`} strokeWidth={full ? 6 : 8} />
          {full && (
            <>
              {/* Cristales facetados en las esquinas */}
              <g fill={`url(#dm-${uid})`} stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.8">
                <path d="M20 40 L30 14 L40 34 L32 46 Z" />
                <path d="M34 22 L44 6 L48 28 Z" opacity="0.85" />
                <path d="M140 120 L130 146 L120 126 L128 114 Z" />
                <path d="M126 138 L116 154 L112 132 Z" opacity="0.85" />
                <path d="M132 22 L150 18 L142 38 Z" opacity="0.9" />
              </g>
              <g className="af-twinkle" fill="#ffffff">
                <path d="M44 10 L46 16 L52 18 L46 20 L44 26 L42 20 L36 18 L42 16 Z" />
                <path d="M150 104 L151.5 108 L156 109.5 L151.5 111 L150 115 L148.5 111 L144 109.5 L148.5 108 Z" style={{ animationDelay: '0.8s' }} />
              </g>
            </>
          )}
        </svg>
      );

    case 'chroma':
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <defs>
            <linearGradient id={`cr-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7cf3ff" />
              <stop offset="0.5" stopColor="#ff4fd8" />
              <stop offset="1" stopColor="#ff8a3d" />
            </linearGradient>
          </defs>
          <rect {...rect} fill="none" stroke={`url(#cr-${uid})`} strokeWidth={full ? 6 : 8} className="af-hue" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 160 160" style={style} aria-hidden="true">
          <rect {...rect} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth={full ? 3 : 5} />
        </svg>
      );
  }
}
