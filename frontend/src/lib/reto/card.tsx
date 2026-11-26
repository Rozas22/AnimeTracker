// Solo servidor: imágenes para compartir. Sin portadas, respuestas ni datos personales.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import React from 'react';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { RoundMark } from './share';
import { MAX_SCORE } from './types';

const INK = '#0c0e14';
const LIME = '#c6f432';
const TEXT = '#f3f4f7';
const MUTED = '#aab0c0';
const COLORS: Record<RoundMark, string> = { good: LIME, partial: '#e3b341', miss: '#e04a66', none: '#2a2f3b' };

interface Assets {
  fonts: Array<{ name: string; data: Buffer; weight: 500 | 800; style: 'normal' }>;
  logo: string;
}
let assets: Promise<Assets> | null = null;

async function buildAssets(): Promise<Assets> {
  const [medium, bold, logoFile] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/lexend-500.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/lexend-800.ttf')),
    readFile(join(process.cwd(), 'public/logo.png')),
  ]);
  const logo = await sharp(logoFile).resize({ width: 220 }).png().toBuffer();
  return {
    fonts: [
      { name: 'Lexend', data: medium, weight: 500, style: 'normal' },
      { name: 'Lexend', data: bold, weight: 800, style: 'normal' },
    ],
    logo: `data:image/png;base64,${logo.toString('base64')}`,
  };
}

function loadAssets(): Promise<Assets> {
  if (assets) return assets;
  const pending = buildAssets().catch((e: unknown) => {
    assets = null;
    throw e;
  });
  assets = pending;
  return pending;
}

function Brand({ logo, size }: { logo: string; size: number }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} width={size} height={size} alt="" />
      <div style={{ display: 'flex', fontSize: size * 0.48, fontWeight: 800, color: TEXT }}>
        Kurama<span style={{ color: LIME }}>Tracker</span>
      </div>
    </div>
  );
}

function Squares({ marks, size }: { marks: RoundMark[]; size: number }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: size * 0.2 }}>
      {marks.map((m, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: size * 0.22, background: COLORS[m] }} />
      ))}
    </div>
  );
}

/** Vista previa del enlace (WhatsApp, Discord, etc.). */
export async function renderPreviewCard(n: number, headers: Record<string, string>): Promise<ImageResponse> {
  const { fonts, logo } = await loadAssets();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', fontFamily: 'Lexend', color: TEXT, background: `radial-gradient(circle at 50% 0%, #2b3510, ${INK} 62%)` }}>
        <Brand logo={logo} size={84} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
            Reto diario<span style={{ color: LIME, marginLeft: 30 }}>#{n}</span>
          </div>
          <div style={{ display: 'flex', marginTop: 26, fontSize: 40, fontWeight: 500, color: '#d6d9e2' }}>5 rondas de anime. ¿Me superas?</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Squares marks={['good', 'partial', 'good', 'miss', 'good']} size={56} />
          <div style={{ display: 'flex', borderRadius: 999, background: LIME, color: INK, padding: '16px 32px', fontSize: 32, fontWeight: 800 }}>Juega sin registrarte</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers }
  );
}

/** Imagen vertical del resultado para historias de Instagram. */
export async function renderResultCard(n: number, score: number, marks: RoundMark[], headers: Record<string, string>): Promise<ImageResponse> {
  const { fonts, logo } = await loadAssets();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '270px 80px 360px', fontFamily: 'Lexend', color: TEXT, background: `radial-gradient(circle at 50% 20%, #2b3510, ${INK} 62%)` }}>
        <Brand logo={logo} size={120} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800 }}>
            Reto diario<span style={{ color: LIME, marginLeft: 20 }}>#{n}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 54 }}>
            <span style={{ fontSize: 210, fontWeight: 800, lineHeight: 1, letterSpacing: -6 }}>{score}</span>
            <span style={{ marginLeft: 18, fontSize: 56, fontWeight: 500, color: MUTED }}>/ {MAX_SCORE}</span>
          </div>
          <div style={{ display: 'flex', marginTop: 64 }}>
            <Squares marks={marks} size={118} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: LIME }}>¿Me superas?</div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 38, fontWeight: 500, color: '#d6d9e2' }}>Juega gratis en kuramatracker.com</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers }
  );
}
