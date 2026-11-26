import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Entrar' };

const ERRORS: Record<string, string> = {
  config: 'El inicio de sesión no está configurado en el servidor (faltan las claves de AniList).',
  'sin-codigo': 'AniList no devolvió ningún código. Vuelve a intentarlo.',
  token: 'AniList rechazó el inicio de sesión. Vuelve a intentarlo.',
  perfil: 'No se pudo leer tu perfil de AniList. Vuelve a intentarlo.',
  red: 'No hay conexión con AniList ahora mismo. Inténtalo en unos minutos.',
  caducado: 'El inicio de sesión ha caducado. Vuelve a intentarlo.',
  estado: 'No se pudo verificar el inicio de sesión. Vuelve a intentarlo.',
};

export default function EntrarPage({
  searchParams,
}: {
  searchParams: { error?: string };
}): React.JSX.Element {
  const error = searchParams.error ? (ERRORS[searchParams.error] ?? 'No se pudo iniciar sesión.') : null;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-[10px] bg-popover p-1">
            <Image src="/logo.png" alt="" fill sizes="44px" className="object-contain" priority />
          </div>
          <span className="font-display text-xl font-bold text-white">
            Kurama<span className="text-kurama">Tracker</span>
          </span>
        </div>

        <h1 className="mt-10 font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          Tu anime, tu nivel, tu liga.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Entra con tu cuenta de AniList: sincronizamos tu lista, subes de nivel con cada episodio y compites cada mes
          con el quiz diario.
        </p>

        {error && (
          <p role="alert" className="mt-6 rounded-[10px] bg-popover px-4 py-3 text-sm text-[#ff6b81]">
            {error}
          </p>
        )}

        <a
          href="/auth/anilist"
          className="mt-8 flex h-14 w-full items-center justify-center rounded-[12px] bg-kurama font-display text-base font-semibold text-ink transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Entrar con AniList
        </a>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Solo leemos tu perfil y tu lista; tus cambios de progreso se guardan en AniList.
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href="/privacidad" className="text-muted-foreground underline underline-offset-2 hover:text-white">
            Privacidad y cookies
          </Link>
        </p>
      </div>
    </main>
  );
}
