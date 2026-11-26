import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { JoinInvite } from '@/components/ligas/JoinInvite';
import { normalizeCode, previewInvite } from '@/lib/ligas/server';
import { getVerifiedAniListId } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Invitación a una liga privada',
  description: 'Te han invitado a competir en una liga privada del Reto diario de anime.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  openGraph: {
    type: 'website',
    siteName: 'KuramaTracker',
    title: 'Te han invitado a una liga privada',
    description: 'Compite con tus amigos en el Reto diario de anime.',
    images: [{ url: '/reto/tarjeta', width: 1200, height: 630, alt: 'Reto diario de KuramaTracker' }],
  },
};

function Box({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mx-auto mt-4 max-w-md rounded-[22px] bg-card p-6 sm:mt-10 sm:p-8" style={{ boxShadow: 'var(--shadow-tile)' }}>
      <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-white/[0.06] text-kurama">
        <Users className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 break-words font-display text-2xl font-bold text-white">{title}</h1>
      {children}
    </div>
  );
}

const secondary = 'mt-5 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-white/[0.08] font-semibold text-white';

export default async function UnirsePage({ params }: { params: { codigo: string } }): Promise<React.JSX.Element> {
  const code = normalizeCode(decodeURIComponent(params.codigo));
  const me = await getVerifiedAniListId();

  // Sin sesión no se muestra nada de la liga: ni nombre ni miembros
  if (!me) {
    return (
      <Box title="Te han invitado a una liga privada">
        <p className="mt-2 text-sm text-muted-foreground">Entra con AniList para unirte. Las ligas privadas no tienen premios ni pagos.</p>
        <a href={`/auth/anilist?next=${encodeURIComponent(`/unirse/${code ?? params.codigo}`)}`} className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-kurama font-semibold text-ink">
          Entrar con AniList
        </a>
        <Link href="/reto" className={secondary}>Probar el reto sin cuenta</Link>
      </Box>
    );
  }

  const invite = code ? await previewInvite(code, me) : null;
  if (!invite) {
    return (
      <Box title="Invitación no válida">
        <p className="mt-2 text-sm text-muted-foreground">El enlace es incorrecto o el código ha cambiado. Pide uno nuevo a quien creó la liga.</p>
        <Link href="/ligas" className={secondary}>Ir a mis ligas</Link>
      </Box>
    );
  }
  if (invite.status === 'blocked') {
    return (
      <Box title="No puedes unirte">
        <p className="mt-2 text-sm text-muted-foreground">Te expulsaron de esta liga, así que no puedes volver a entrar.</p>
        <Link href="/ligas" className={secondary}>Ir a mis ligas</Link>
      </Box>
    );
  }
  if (invite.status === 'full') {
    return (
      <Box title={invite.name}>
        <p className="mt-2 text-sm text-muted-foreground">Esta liga ya está completa.</p>
        <Link href="/ligas" className={secondary}>Ir a mis ligas</Link>
      </Box>
    );
  }
  if (invite.status === 'member') {
    return (
      <Box title={invite.name}>
        <p className="mt-2 text-sm text-muted-foreground">Ya formas parte de esta liga.</p>
        <Link href={`/ligas/${invite.id}`} className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-kurama font-semibold text-ink">Ver la liga</Link>
      </Box>
    );
  }
  return (
    <Box title={invite.name}>
      <p className="mt-2 text-sm text-muted-foreground">
        {invite.members} {invite.members === 1 ? 'miembro' : 'miembros'}. Compite con los puntos del Reto diario. Sin premios ni pagos.
      </p>
      <JoinInvite code={code!} />
    </Box>
  );
}
