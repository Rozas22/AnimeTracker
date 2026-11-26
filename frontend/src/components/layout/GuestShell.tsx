import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

/** Marco de las páginas que se pueden usar sin cuenta. */
export function GuestShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-background pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/reto" className="flex min-w-0 items-center gap-2.5">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[10px] bg-popover">
              <Image src="/logo.png" alt="" fill sizes="36px" className="object-contain" priority />
            </span>
            <span className="truncate font-display text-base font-bold tracking-tight text-white">
              Kurama<span className="text-kurama">Tracker</span>
            </span>
          </Link>
          <a
            href="/auth/anilist?next=/reto"
            className="inline-flex h-10 shrink-0 items-center rounded-[10px] bg-card px-4 text-sm font-semibold text-white transition-colors hover:bg-accent"
          >
            Entrar
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:py-8">{children}</main>
      <footer className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs">
        <Link href="/privacidad" className="text-muted-foreground underline underline-offset-2 hover:text-white">
          Privacidad y cookies
        </Link>
      </footer>
    </div>
  );
}
