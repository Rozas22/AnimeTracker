import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { NavigationShell } from '@/components/layout/NavigationShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      className={`${inter.variable} ${outfit.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NavigationShell>{children}</NavigationShell>
      </body>
    </html>
  );
}
