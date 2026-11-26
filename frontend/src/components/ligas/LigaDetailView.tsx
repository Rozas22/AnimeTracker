'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Crown, LogOut, RefreshCw, Share2, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { kickMemberAction, leaveLeagueAction, rotateInviteCodeAction } from '@/lib/ligas/actions';
import { LEAGUE_LIMITS, type LeagueDetail, type LeagueRow } from '@/lib/ligas/types';

const nf = new Intl.NumberFormat('es-ES');
const card = { boxShadow: 'var(--shadow-tile)' };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function LigaDetailView({ initial }: { initial: LeagueDetail }): React.JSX.Element {
  const router = useRouter();
  const [league, setLeague] = useState(initial);
  const [scope, setScope] = useState<'week' | 'month'>('week');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const rows = league[scope];

  const say = (message: string): void => {
    setStatus(message);
    window.setTimeout(() => setStatus(''), 2500);
  };
  const inviteUrl = (): string => `${window.location.origin}/unirse/${league.code}`;

  const shareInvite = async (): Promise<void> => {
    const url = inviteUrl();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: `Únete a mi liga privada del Reto diario de KuramaTracker: ${url}` });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    say((await copyText(url)) ? 'Enlace copiado' : 'No se pudo copiar');
  };

  const run = async (fn: () => ReturnType<typeof rotateInviteCodeAction>, done: string): Promise<void> => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    setConfirm(null);
    if (res.ok) {
      setLeague(res.data);
      say(done);
    } else setError(res.error);
  };

  const leave = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const res = await leaveLeagueAction(league.id);
    if (res.ok) {
      router.push('/ligas');
      router.refresh();
    } else {
      setBusy(false);
      setConfirm(null);
      setError(res.error);
    }
  };

  const ownerLeaveText = league.members > 1 ? 'La liga pasará al miembro más antiguo.' : 'Eres el único miembro: la liga se borrará.';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/ligas" aria-label="Volver a tus ligas" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-white sm:text-3xl">{league.name}</h1>
          <p className="text-sm text-muted-foreground">{league.members} de {LEAGUE_LIMITS.members} miembros · sin premios ni pagos</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-[12px] bg-[#e04a66]/15 px-4 py-3 text-sm text-[#ff8da1]">{error}</p>}

      <section className="rounded-[22px] bg-card p-5 sm:p-7" style={card} aria-labelledby="ranking-liga">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ranking-liga" className="font-display text-lg font-bold text-white">Clasificación</h2>
          <div role="tablist" aria-label="Periodo" className="flex rounded-full bg-white/[0.06] p-1">
            {([['week', 'Semana'], ['month', 'Mes']] as const).map(([k, label]) => (
              <button key={k} role="tab" type="button" aria-selected={scope === k} onClick={() => setScope(k)} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', scope === k ? 'bg-kurama text-ink' : 'text-muted-foreground hover:text-white')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-4 divide-y divide-white/[0.05]">
          {rows.map((r) => (
            <Row
              key={r.key}
              row={r}
              canKick={league.isOwner && !r.isMe && Boolean(r.memberKey)}
              confirming={confirm === r.key}
              busy={busy}
              onAsk={() => setConfirm(r.key)}
              onCancel={() => setConfirm(null)}
              onKick={() => void run(() => kickMemberAction(league.id, r.memberKey!), 'Miembro expulsado')}
            />
          ))}
        </ol>
        <Link href="/reto" className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-kurama font-semibold text-ink sm:w-auto sm:px-6">Jugar el reto de hoy</Link>
      </section>

      <section className="rounded-[18px] bg-card p-5" style={card} aria-labelledby="invitar">
        <h2 id="invitar" className="font-display text-lg font-bold text-white">Invitar amigos</h2>
        <p className="mt-3 rounded-[12px] bg-background px-4 py-3 text-center font-display text-xl font-bold tracking-[0.2em] text-white">{league.code}</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => void shareInvite()} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-kurama text-sm font-semibold text-ink">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartir
          </button>
          <button type="button" onClick={() => void copyText(inviteUrl()).then((ok) => say(ok ? 'Enlace copiado' : 'No se pudo copiar'))} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-white/[0.08] text-sm font-semibold text-white hover:bg-white/[0.13]">
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copiar enlace
          </button>
        </div>
        <p role="status" className="mt-2 min-h-5 text-sm font-medium text-kurama">{status}</p>
        {league.isOwner && (
          <button type="button" disabled={busy} onClick={() => void run(() => rotateInviteCodeAction(league.id), 'Código cambiado')} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white disabled:opacity-50">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Cambiar código (el anterior dejará de funcionar)
          </button>
        )}
      </section>

      <section className="rounded-[18px] bg-card p-5" style={card}>
        {confirm === 'leave' ? (
          <div>
            <p className="text-sm text-white">¿Seguro que quieres salir de esta liga?{league.isOwner ? ` ${ownerLeaveText}` : ''}</p>
            <div className="mt-3 flex gap-2.5">
              <button type="button" disabled={busy} onClick={() => void leave()} className="h-11 rounded-[12px] bg-[#e04a66] px-5 text-sm font-semibold text-white disabled:opacity-50">Salir de la liga</button>
              <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-[12px] bg-white/[0.08] px-5 text-sm font-semibold text-white">Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm('leave')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff8da1]">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir de la liga
          </button>
        )}
      </section>
    </div>
  );
}

function Row({ row, canKick, confirming, busy, onAsk, onCancel, onKick }: {
  row: LeagueRow;
  canKick: boolean;
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onKick: () => void;
}): React.JSX.Element {
  return (
    <li className={cn('px-2 py-3', row.isMe && 'rounded-[12px] bg-kurama/10')}>
      <div className="flex items-center gap-3">
        <span className={cn('w-7 shrink-0 text-center font-display font-bold tabular', row.place === 1 ? 'text-[#e3b341]' : 'text-muted-foreground')}>{row.place}</span>
        <span className="min-w-0 flex-1">
          <span className={cn('flex items-center gap-1.5 font-semibold', row.isMe ? 'text-kurama' : 'text-white')}>
            <span className="truncate">{row.name}</span>
            {row.isOwner && <Crown className="h-3.5 w-3.5 shrink-0 text-[#e3b341]" aria-label="Creador de la liga" />}
            {row.isMe && <span className="shrink-0 text-xs font-medium text-muted-foreground">tú</span>}
          </span>
          <span className="block text-xs text-muted-foreground">{row.plays} {row.plays === 1 ? 'reto' : 'retos'}</span>
        </span>
        <span className="font-display font-bold text-white tabular">{nf.format(row.score)}</span>
        {canKick && !confirming && (
          <button type="button" onClick={onAsk} aria-label={`Expulsar a ${row.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[#e04a66]/15 hover:text-[#ff8da1]">
            <UserX className="h-4 w-4" />
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
          <span className="text-sm text-white">¿Expulsar? No podrá volver a entrar.</span>
          <button type="button" disabled={busy} onClick={onKick} className="h-9 rounded-[10px] bg-[#e04a66] px-3 text-sm font-semibold text-white disabled:opacity-50">Expulsar</button>
          <button type="button" onClick={onCancel} className="h-9 rounded-[10px] bg-white/[0.08] px-3 text-sm font-semibold text-white">Cancelar</button>
        </div>
      )}
    </li>
  );
}
