'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Crown, Loader2, Plus, Ticket, Users } from 'lucide-react';
import { createLeagueAction, joinLeagueAction } from '@/lib/ligas/actions';
import { LEAGUE_LIMITS, type LeagueSummary } from '@/lib/ligas/types';

const card = { boxShadow: 'var(--shadow-tile)' };
const input = 'h-12 w-full min-w-0 rounded-[12px] border border-white/10 bg-background px-4 text-base text-white placeholder:text-muted-foreground focus:border-kurama focus:outline-none';

export function LigasHome({ leagues }: { leagues: LeagueSummary[] }): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (kind: 'create' | 'join', run: () => ReturnType<typeof createLeagueAction>): Promise<void> => {
    setBusy(kind);
    setError(null);
    const res = await run();
    if (res.ok) {
      router.push(`/ligas/${res.data}`);
      router.refresh();
    } else {
      setError(res.error);
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Ligas privadas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compite con tus amigos usando los puntos del Reto diario. Sin premios ni pagos.</p>
      </header>

      {error && <p role="alert" className="rounded-[12px] bg-[#e04a66]/15 px-4 py-3 text-sm text-[#ff8da1]">{error}</p>}

      <section aria-labelledby="mis-ligas" className="space-y-3">
        <h2 id="mis-ligas" className="font-display text-lg font-bold text-white">Tus ligas</h2>
        {leagues.length === 0 ? (
          <p className="rounded-[18px] bg-card p-6 text-sm text-muted-foreground" style={card}>Aún no estás en ninguna liga. Crea una e invita a tus amigos.</p>
        ) : (
          <ul className="overflow-hidden rounded-[18px] bg-card" style={card}>
            {leagues.map((l) => (
              <li key={l.id} className="border-b border-white/[0.05] last:border-0">
                <Link href={`/ligas/${l.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.04]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/[0.06] text-kurama">
                    {l.isOwner ? <Crown className="h-5 w-5" aria-hidden="true" /> : <Users className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{l.name}</span>
                    <span className="block text-sm text-muted-foreground">{l.members} {l.members === 1 ? 'miembro' : 'miembros'}{l.isOwner ? ' · la creaste tú' : ''}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <form
          className="rounded-[18px] bg-card p-5"
          style={card}
          onSubmit={(e) => {
            e.preventDefault();
            void go('create', () => createLeagueAction(name));
          }}
        >
          <label htmlFor="liga-nombre" className="flex items-center gap-2 font-display font-bold text-white">
            <Plus className="h-4 w-4 text-kurama" aria-hidden="true" />
            Crear liga
          </label>
          <input id="liga-nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={LEAGUE_LIMITS.nameMax} placeholder="Nombre de la liga" autoComplete="off" className={`${input} mt-3`} />
          <p className="mt-2 text-xs text-muted-foreground">No uses nombres reales ni datos personales.</p>
          <button type="submit" disabled={busy !== null || name.trim().length < LEAGUE_LIMITS.nameMin} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-kurama font-semibold text-ink disabled:opacity-50">
            {busy === 'create' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Crear
          </button>
        </form>

        <form
          className="rounded-[18px] bg-card p-5"
          style={card}
          onSubmit={(e) => {
            e.preventDefault();
            void go('join', () => joinLeagueAction(code));
          }}
        >
          <label htmlFor="liga-codigo" className="flex items-center gap-2 font-display font-bold text-white">
            <Ticket className="h-4 w-4 text-kurama" aria-hidden="true" />
            Unirme con código
          </label>
          <input id="liga-codigo" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} placeholder="Código de 10 letras" autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${input} mt-3 tracking-wider`} />
          <p className="mt-2 text-xs text-muted-foreground">Pídeselo a quien creó la liga.</p>
          <button type="submit" disabled={busy !== null || code.trim().length < 10} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-white/[0.08] font-semibold text-white transition-colors hover:bg-white/[0.13] disabled:opacity-50">
            {busy === 'join' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Unirme
          </button>
        </form>
      </div>
    </div>
  );
}
