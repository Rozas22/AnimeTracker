import React from 'react';
import type { Metadata } from 'next';
import { RetoGame } from '@/components/reto/RetoGame';
import { getRetoStateAction } from '@/lib/reto/actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reto diario' };

export default async function RetoPage(): Promise<React.JSX.Element> {
  const res = await getRetoStateAction();
  return <RetoGame initial={res.ok ? res.data : null} initialError={res.ok ? null : res.error} />;
}
