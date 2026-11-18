'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  ListVideo,
  Search,
  Users,
  Swords,
  BarChart3,
  Bell,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { AnimeFrame } from '@/components/frames/AnimeFrame';
import { resolveUnifiedUserLevel, FRAME_STYLES, resolveDisplayFrame } from '@/lib/league';

export interface NavItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  showInMobileBar: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Mi Perfil',
    shortLabel: 'Perfil',
    href: '/',
    icon: User,
    showInMobileBar: true,
  },
  {
    label: 'Mi Lista',
    shortLabel: 'Lista',
    href: '/lista',
    icon: ListVideo,
    showInMobileBar: true,
  },
  {
    label: 'Buscador',
    shortLabel: 'Buscar',
    href: '/buscador',
    icon: Search,
    showInMobileBar: true,
  },
  {
    label: 'El Grupo',
    shortLabel: 'Grupo',
    href: '/grupo',
    icon: Users,
    showInMobileBar: true,
  },
  {
    label: 'Arena & Quiz',
    shortLabel: 'Arena',
    href: '/arena',
    icon: Swords,
    badge: 'PL',
    showInMobileBar: true,
  },
  {
    label: 'Estadísticas',
    shortLabel: 'Stats',
    href: '/analisis',
    icon: BarChart3,
    showInMobileBar: false,
  },
] as const;

const DEFAULT_AVATAR_URL =
  'https://s4.anilist.co/file/anilistcdn/user/avatar/large/b7952169-aN2k8haFFNOq.png';

export interface NavigationShellProps {
  children: React.ReactNode;
  initialUsername?: string;
  initialAvatarUrl?: string | null;
  initialEpisodesWatched?: number;
}

export function NavigationShell({
  children,
  initialUsername = 'Rozas22',
  initialAvatarUrl = DEFAULT_AVATAR_URL,
  initialEpisodesWatched = 5428,
}: NavigationShellProps): React.JSX.Element {
  const pathname = usePathname();
  const { profile } = useSupabaseUser(7952169);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // Registro y auto-actualización silenciosa del Service Worker (PWA)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => undefined);
      })
      .catch((err: unknown) => {
        console.warn('[PWA] Error registrando Service Worker:', err);
      });
  }, []);

  // Nivel unificado utilizando la misma fuente de verdad que el resto de la app
  const unifiedLevel = useMemo(
    () =>
      resolveUnifiedUserLevel({
        anilistEpisodesWatched: initialEpisodesWatched,
        supabaseAnimePoints: profile?.anime_points,
        supabaseStoredLevel: profile?.level,
      }),
    [initialEpisodesWatched, profile]
  );

  const frameStyle = FRAME_STYLES[unifiedLevel.unlockedFrame];
  const displayUsername = profile?.username ?? initialUsername;
  const resolvedAvatar =
    !avatarError && initialAvatarUrl ? initialAvatarUrl : '/logo.png';

  const isRouteActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR LATERAL (SOLO DESKTOP >= md)
         ═══════════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col border-r border-white/[0.05] bg-[#090b10]">
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 overflow-hidden rounded-[10px] bg-popover p-1 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="KuramaTracker"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Kurama<span className="text-kurama">Tracker</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3.5 rounded-[10px] px-4 py-3 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'text-white font-semibold'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="desktop-active-nav"
                    className="absolute inset-0 rounded-[10px] bg-popover"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    'relative z-10 h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                    active ? 'text-kurama' : 'text-muted-foreground group-hover:text-white'
                  )}
                />
                <span className="relative z-10 flex-1">{item.label}</span>

                {item.badge && (
                  <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-popover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions & User Footer con Avatar Real de AniList y Nivel Unificado */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-[12px] bg-card p-2.5">
            <Link
              href="/"
              className="flex items-center gap-2.5 min-w-0 group"
            >
              <AnimeFrame frame={resolveDisplayFrame(unifiedLevel.computedLevel, profile?.selected_frame)} size={36} label={frameStyle.label} className="transition-transform group-hover:scale-105">
                <Image
                  src={resolvedAvatar}
                  alt={displayUsername}
                  fill
                  sizes="36px"
                  className="object-cover"
                  unoptimized={resolvedAvatar.startsWith('http')}
                  onError={() => setAvatarError(true)}
                />
              </AnimeFrame>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate group-hover:text-kurama transition-colors">
                  {displayUsername}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground truncate tabular">
                  Nv. {unifiedLevel.computedLevel} • {unifiedLevel.userTitle}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/ajustes"
                aria-label="Notificaciones y Avisos"
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-kurama" />
              </Link>
              <Link
                href="/ajustes"
                aria-label="Ajustes de Cuenta"
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  pathname === '/ajustes'
                    ? 'bg-popover text-kurama'
                    : 'text-muted-foreground hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENEDOR PRINCIPAL + HEADER MOBILE
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col md:pl-64 min-w-0">
        {/* Top Header Mobile (< md) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.05] bg-background px-4 pt-safe md:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-popover">
              <Image
                src="/logo.png"
                alt="KuramaTracker"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-white">
              Kurama<span className="text-kurama">Tracker</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-[10px] bg-card px-2 py-1"
            >
              <div className="relative h-6 w-6 overflow-hidden rounded-lg">
                <Image
                  src={resolvedAvatar}
                  alt={displayUsername}
                  fill
                  sizes="24px"
                  className="object-cover"
                  unoptimized={resolvedAvatar.startsWith('http')}
                  onError={() => setAvatarError(true)}
                />
              </div>
              <span className="font-display text-xs font-bold text-kurama tabular">
                Nv.{unifiedLevel.computedLevel}
              </span>
            </Link>

            <Link
              href="/ajustes"
              aria-label="Ajustes"
              className={cn(
                'rounded-xl border p-2 transition-colors',
                pathname === '/ajustes'
                  ? 'border-transparent bg-popover text-kurama'
                  : 'border-transparent bg-card text-muted-foreground hover:text-white'
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Área de Contenido de la Página */}
        <main className="flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10 max-w-[1440px] w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BARRA DE NAVEGACIÓN INFERIOR (MOBILE & PWA < md)
         ═══════════════════════════════════════════════════════════════════ */}
      <nav
        aria-label="Navegación principal móvil"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.05] bg-[#090b10] pb-safe md:hidden"
      >
        <div className="grid grid-cols-5 h-16 items-center px-2">
          {NAV_ITEMS.filter((item) => item.showInMobileBar).map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors',
                  active ? 'text-kurama font-semibold' : 'text-muted-foreground hover:text-white'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="mobile-active-nav"
                    className="absolute -top-[1px] h-[3px] w-8 rounded-full bg-kurama"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
