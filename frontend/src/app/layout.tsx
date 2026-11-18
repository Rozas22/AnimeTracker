import React from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/lexend';
import { cookies } from 'next/headers';
import { NavigationShell } from '@/components/layout/NavigationShell';
import { SESSION_COOKIES } from '@/lib/session';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0c0e14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://anime-tracker-wine.vercel.app'
  ),
  title: {
    default: 'KuramaTracker — Rastrea tu Anime y Compite en la Liga',
    template: '%s | KuramaTracker',
  },
  description:
    'Sincroniza tu perfil de AniList, sube de nivel viendo episodios, compite con tus amigos en la Liga Mensual y demuestra cuánto sabes en el Quiz Diario.',
  keywords: [
    'anime tracker',
    'kuramatracker',
    'anilist',
    'quiz anime',
    'liga de anime',
    'seguimiento de anime',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KuramaTracker',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: '/',
    siteName: 'KuramaTracker',
    title: 'KuramaTracker — Rastrea tu Anime y Compite en la Liga',
    description:
      'Rastrea tu anime, compite en el Quiz Diario y sube en el ranking mensual.',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'KuramaTracker Logo',
      },
    ],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>): React.JSX.Element {
  return (
    <html
      lang="es"
      className="dark"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NavigationShell
          anilistId={Number(cookies().get(SESSION_COOKIES.id)?.value) || undefined}
          initialUsername={cookies().get(SESSION_COOKIES.name)?.value}
          initialAvatarUrl={cookies().get(SESSION_COOKIES.avatar)?.value ?? null}
        >
          {children}
        </NavigationShell>
      </body>
    </html>
  );
}
