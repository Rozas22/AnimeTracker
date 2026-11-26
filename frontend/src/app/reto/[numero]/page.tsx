import React from 'react';
import type { Metadata } from 'next';
import { RetoGame } from '@/components/reto/RetoGame';
import { getRetoStateAction } from '@/lib/reto/actions';
import { parseChallengeNumber, retoMetadata, todayChallengeNumber } from '@/lib/reto/share';

export const dynamic = 'force-dynamic';

interface Props {
  params: { numero: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const n = parseChallengeNumber(params.numero);
  return n ? retoMetadata(n) : retoMetadata(todayChallengeNumber(), '/reto');
}

/** Enlace compartido: siempre lleva a jugar el reto de hoy, sin pedir registro. */
export default async function RetoCompartidoPage({ params }: Props): Promise<React.JSX.Element> {
  const n = parseChallengeNumber(params.numero);
  const today = todayChallengeNumber();
  const res = await getRetoStateAction();

  let notice: string | null = null;
  if (!n) notice = 'Ese enlace no es válido. Aquí tienes el reto de hoy.';
  else if (n < today) notice = `El reto #${n} ya terminó. Este es el de hoy: ¿lo superas?`;
  else if (res.ok && !res.data.play) notice = 'Te han retado. Juega gratis y sin registrarte.';

  return <RetoGame initial={res.ok ? res.data : null} initialError={res.ok ? null : res.error} notice={notice} arrival={n ? 'shared' : 'direct'} />;
}
