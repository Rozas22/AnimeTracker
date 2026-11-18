import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface TrophyEmblemProps {
  /** Nivel del hito (10, 20 … 100) */
  level: number;
  /** Posición del hito 0-9: decide cuánta ornamentación lleva el emblema */
  tier: number;
  /** Color del metal del emblema */
  accent: string;
  unlocked: boolean;
  size?: number;
  className?: string;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Ala de plumas (lado izquierdo; el derecho se refleja) */
function Wing({ feathers, fill }: { feathers: number; fill: string }): React.JSX.Element {
  return (
    <g fill={fill}>
      {Array.from({ length: feathers }, (_, i) => {
        const y = 40 + i * 13;
        const reach = 30 - i * 3.5 + feathers * 1.5;
        return (
          <path
            key={i}
            d={`M30 ${y} C ${30 - reach * 0.55} ${y - 8}, ${30 - reach} ${y - 2}, ${30 - reach - 4} ${y + 6} C ${30 - reach * 0.6} ${y + 6}, ${30 - reach * 0.3} ${y + 9}, 30 ${y + 11} Z`}
            opacity={1 - i * 0.12}
          />
        );
      })}
    </g>
  );
}

/**
 * Emblema de trofeo estilo anime: escudo hexagonal de metal con el nivel grabado,
 * alas que crecen con el rango, estrellas de rango y corona en el hito final.
 */
export function TrophyEmblem({ level, tier, accent, unlocked, size = 96, className }: TrophyEmblemProps): React.JSX.Element {
  const uid = useId().replace(/:/g, '');
  const metalLight = unlocked ? shade(accent, 70) : '#4a5162';
  const metalMid = unlocked ? accent : '#353b49';
  const metalDark = unlocked ? shade(accent, -70) : '#20242e';
  const feathers = tier >= 8 ? 5 : tier >= 5 ? 4 : tier >= 2 ? 3 : 0;
  const stars = tier === 9 ? 0 : Math.min(5, Math.floor(tier / 2) + 1);
  const shield = 'M60 14 L98 34 L98 80 L60 106 L22 80 L22 34 Z';
  const inner = 'M60 26 L87 40 L87 75 L60 94 L33 75 L33 40 Z';

  return (
    <svg
      viewBox="0 0 120 124"
      width={size}
      height={(size * 124) / 120}
      className={cn('trophy-emblem overflow-visible', unlocked && 'trophy-emblem--on', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`m-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metalLight} />
          <stop offset="0.5" stopColor={metalMid} />
          <stop offset="1" stopColor={metalDark} />
        </linearGradient>
        <linearGradient id={`n-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={unlocked ? '#ffffff' : '#7d8597'} />
          <stop offset="1" stopColor={unlocked ? metalLight : '#4a5162'} />
        </linearGradient>
        <clipPath id={`c-${uid}`}>
          <path d={shield} />
        </clipPath>
      </defs>

      {/* Alas */}
      {feathers > 0 && (
        <>
          <Wing feathers={feathers} fill={`url(#m-${uid})`} />
          <g transform="translate(120 0) scale(-1 1)">
            <Wing feathers={feathers} fill={`url(#m-${uid})`} />
          </g>
        </>
      )}

      {/* Estrellas de rango o corona final */}
      {tier === 9 ? (
        <path
          d="M40 12 L46 0 L53 9 L60 -4 L67 9 L74 0 L80 12 Z"
          fill={`url(#m-${uid})`}
          stroke={metalDark}
          strokeWidth="1"
        />
      ) : (
        <g fill={unlocked ? metalLight : '#4a5162'}>
          {Array.from({ length: stars }, (_, i) => {
            const x = 60 + (i - (stars - 1) / 2) * 11;
            return (
              <path
                key={i}
                transform={`translate(${x} 6) scale(0.55)`}
                d="M0 -9 L2.6 -3 L9 -2.8 L4 1.4 L5.6 8 L0 4.4 L-5.6 8 L-4 1.4 L-9 -2.8 L-2.6 -3 Z"
              />
            );
          })}
        </g>
      )}

      {/* Escudo de metal */}
      <path d={shield} fill={`url(#m-${uid})`} stroke={metalDark} strokeWidth="1.5" />
      <path d={inner} fill="#0c0e14" stroke={unlocked ? metalLight : '#4a5162'} strokeWidth="1.2" strokeOpacity="0.7" />
      <text
        x="60"
        y="69"
        textAnchor="middle"
        fontFamily="var(--font-lexend), system-ui, sans-serif"
        fontWeight={800}
        fontSize={level >= 100 ? 24 : 28}
        fill={`url(#n-${uid})`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {level}
      </text>

      {/* Destello que cruza el metal */}
      {unlocked && (
        <g clipPath={`url(#c-${uid})`}>
          <rect className="trophy-shine" x="-40" y="0" width="22" height="124" fill="#ffffff" opacity="0.35" transform="skewX(-20)" />
        </g>
      )}

      {/* Candado si está bloqueado */}
      {!unlocked && (
        <g transform="translate(60 104)">
          <circle r="11" fill="#161922" stroke="#353b49" />
          <path d="M-4 -1 V-4 A4 4 0 0 1 4 -4 V-1" fill="none" stroke="#9aa0b0" strokeWidth="1.6" />
          <rect x="-5.5" y="-1" width="11" height="8" rx="1.5" fill="#9aa0b0" />
        </g>
      )}
    </svg>
  );
}
