import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricsReport, type MetricsReport } from '@/lib/metrics/server';
import { isVerifiedAdmin } from '@/lib/session-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Métricas', robots: { index: false, follow: false } };

const RANGES = [7, 30, 90] as const;
const nf = new Intl.NumberFormat('es-ES');
const card = { boxShadow: 'var(--shadow-tile)' };
const pct = (part: number, total: number): string => (total > 0 ? `${Math.round((part / total) * 100)} %` : '—');

function Stat({ label, value, note }: { label: string; value: number; note?: string }): React.JSX.Element {
  return (
    <div className="rounded-[16px] bg-card p-4" style={card}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-white tabular">{nf.format(value)}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Funnel({ t }: { t: MetricsReport['totals'] }): React.JSX.Element {
  const steps = [
    ['Visitas al reto', t.visits],
    ['Partidas empezadas', t.started],
    ['Partidas terminadas', t.finished],
    ['Resultados compartidos', t.shared],
  ] as const;
  const max = Math.max(1, ...steps.map(([, v]) => v));
  return (
    <section className="rounded-[18px] bg-card p-5" style={card} aria-labelledby="embudo">
      <h2 id="embudo" className="font-display text-lg font-bold text-white">Embudo del reto</h2>
      <ol className="mt-4 space-y-3">
        {steps.map(([label, value], i) => (
          <li key={label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-white">{label}</span>
              <span className="text-muted-foreground tabular">
                <b className="font-semibold text-white">{nf.format(value)}</b>
                {i > 0 ? ` · ${pct(value, steps[i - 1]![1])}` : ''}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-kurama" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function MetricasPage({ searchParams }: { searchParams: { dias?: string } }): Promise<React.JSX.Element> {
  if (!(await isVerifiedAdmin())) notFound();
  const days = RANGES.find((r) => String(r) === searchParams.dias) ?? 30;

  let report: MetricsReport | null = null;
  let error: string | null = null;
  try {
    report = await getMetricsReport(days);
  } catch (e) {
    error = e instanceof Error ? e.message : 'No se pudieron cargar las métricas.';
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/ajustes" aria-label="Volver a Ajustes" className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Métricas</h1>
            <p className="text-sm text-muted-foreground">Totales anónimos · sin tu cuenta</p>
          </div>
        </div>
        <nav aria-label="Periodo" className="flex rounded-full bg-white/[0.06] p-1">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/metricas?dias=${r}`} aria-current={r === days ? 'page' : undefined} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold', r === days ? 'bg-kurama text-ink' : 'text-muted-foreground hover:text-white')}>
              {r} días
            </Link>
          ))}
        </nav>
      </header>

      {error && <p role="alert" className="rounded-[12px] bg-[#e04a66]/15 px-4 py-3 text-sm text-[#ff8da1]">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Visitas al reto" value={report.totals.visits} note={`${nf.format(report.totals.sharedVisits)} desde enlaces compartidos`} />
            <Stat label="Partidas terminadas" value={report.totals.finished} note={`${nf.format(report.totals.finishedGuest)} de invitados`} />
            <Stat label="Registros tras jugar" value={report.totals.signups} note={`${nf.format(report.totals.guestSaved)} partidas guardadas`} />
            <Stat label="Ligas creadas" value={report.totals.leaguesCreated} note={`${nf.format(report.totals.leaguesJoined)} entradas a ligas`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Funnel t={report.totals} />
            <section className="rounded-[18px] bg-card p-5" style={card} aria-labelledby="retencion">
              <h2 id="retencion" className="font-display text-lg font-bold text-white">Retención de cuentas</h2>
              <p className="mt-1 text-sm text-muted-foreground">{nf.format(report.retention.players)} jugadores con cuenta, histórico. Los invitados no se siguen entre días.</p>
              <dl className="mt-4 grid grid-cols-3 gap-2.5">
                {report.retention.cohorts.map((c) => (
                  <div key={c.days} className="rounded-[12px] bg-white/[0.04] p-3">
                    <dt className="text-sm text-muted-foreground">Día {c.days}</dt>
                    <dd className="mt-1 font-display text-2xl font-bold text-white tabular">{pct(c.retained, c.eligible)}</dd>
                    <dd className="text-xs text-muted-foreground tabular">{c.retained} de {c.eligible}</dd>
                  </div>
                ))}
              </dl>
              {report.retention.cohorts.some((c) => c.eligible < 20) && (
                <p className="mt-3 text-xs text-[#e3b341]">Con menos de 20 jugadores por columna, el porcentaje todavía es orientativo.</p>
              )}
            </section>
          </div>

          <section className="rounded-[18px] bg-card p-5" style={card} aria-labelledby="por-dia">
            <h2 id="por-dia" className="font-display text-lg font-bold text-white">Por día (UTC)</h2>
            {report.daily.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Todavía no hay datos en este periodo.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[620px] text-right text-sm tabular">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      {['Día', 'Visitas', 'Compartidas', 'Empezadas', 'Terminadas', 'Compartir', 'Registros', 'Ligas'].map((h, i) => (
                        <th key={h} scope="col" className={cn('px-2 py-2 font-medium', i === 0 && 'text-left')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-white">
                    {report.daily.map((d) => (
                      <tr key={d.day}>
                        <th scope="row" className="px-2 py-2 text-left font-medium">{d.day.slice(8)}/{d.day.slice(5, 7)}</th>
                        <td className="px-2 py-2">{d.visits}</td>
                        <td className="px-2 py-2">{d.sharedVisits}</td>
                        <td className="px-2 py-2">{d.started}</td>
                        <td className="px-2 py-2">{d.finished}</td>
                        <td className="px-2 py-2">{d.shared}</td>
                        <td className="px-2 py-2">{d.signups}</td>
                        <td className="px-2 py-2">{d.leagues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
