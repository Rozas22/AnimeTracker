'use client';

import React, { useEffect } from 'react';
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

interface NavigationShellProps {
  children: React.ReactNode;
}

export function NavigationShell({ children }: NavigationShellProps): React.JSX.Element {
  const pathname = usePathname();

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

  const isRouteActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR LATERAL (SOLO DESKTOP >= md)
         ═══════════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col border-r border-white/[0.08] bg-card/60 backdrop-blur-2xl">
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-kurama/40 bg-kurama/10 p-1 transition-transform duration-300 group-hover:scale-105">
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
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                Kurama<span className="text-kurama">Tracker</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Anime &amp; League
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
                  'group relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'text-white font-semibold'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="desktop-active-nav"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-kurama/20 via-kurama/10 to-transparent border border-kurama/30"
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
                  <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-kurama/20 border border-kurama/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-kurama">
                    <Sparkles className="h-2.5 w-2.5" />
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions & User Footer */}
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-background/60 p-2.5 border border-white/[0.06]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-kurama/20 border border-kurama/40 flex items-center justify-center text-xs font-bold text-kurama shrink-0">
                KT
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">Mi Cuenta</p>
                <p className="text-[11px] text-muted-foreground truncate">Sincronizado</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Centro de Notificaciones"
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-kurama" />
              </button>
              <Link
                href="/ajustes"
                aria-label="Ajustes"
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-white transition-colors"
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-background/80 px-4 backdrop-blur-xl pt-safe md:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-kurama/40 bg-kurama/10">
              <Image
                src="/logo.png"
                alt="KuramaTracker"
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span className="font-display text-base font-extrabold tracking-tight text-white">
              Kurama<span className="text-kurama">Tracker</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative rounded-xl border border-white/[0.08] bg-card/70 p-2 text-muted-foreground hover:text-white"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-kurama" />
            </button>
            <Link
              href="/ajustes"
              aria-label="Ajustes"
              className="rounded-xl border border-white/[0.08] bg-card/70 p-2 text-muted-foreground hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Área de Contenido de la Página */}
        <main className="flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BARRA DE NAVEGACIÓN INFERIOR (MOBILE & PWA < md)
         ═══════════════════════════════════════════════════════════════════ */}
      <nav
        aria-label="Navegación principal móvil"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-card/90 backdrop-blur-2xl pb-safe md:hidden"
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
                    className="absolute -top-[1px] h-0.5 w-8 rounded-full bg-kurama shadow-[0_0_10px_#f59e0b]"
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
