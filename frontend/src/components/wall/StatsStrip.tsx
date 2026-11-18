import React from 'react';
import type { MediaListEntry, MediaListStatus, UserAnimeStatistics } from '@/types/anilist';

export interface StatsStripProps {
  statistics: UserAnimeStatistics;
  entries: MediaListEntry[];
  /** 'figures': solo las cuatro cifras (base de la cabecera). 'charts': gráficos (y cifras en móvil). */
  variant?: 'figures' | 'charts';
}

const nf = new Intl.NumberFormat('es-ES');
const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** Paleta categórica validada (modo oscuro sobre #161922), en orden fijo por estado. */
const STATUS_SERIES: ReadonlyArray<{ key: MediaListStatus; label: string; color: string }> = [
  { key: 'CURRENT', label: 'Viendo', color: '#7fa418' },
  { key: 'COMPLETED', label: 'Completados', color: '#3a8fe0' },
  { key: 'PLANNING', label: 'Pendientes', color: '#c47a16' },
  { key: 'PAUSED', label: 'En pausa', color: '#9a76f0' },
  { key: 'DROPPED', label: 'Abandonados', color: '#e04a66' },
];

const GENRE_ES: Record<string, string> = {
  Action: 'Acción',
  Adventure: 'Aventura',
  Comedy: 'Comedia',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasía',
  Horror: 'Terror',
  'Mahou Shoujo': 'Mahou shoujo',
  Mecha: 'Mecha',
  Music: 'Música',
  Mystery: 'Misterio',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  'Sci-Fi': 'Ciencia ficción',
  'Slice of Life': 'Recuentos de la vida',
  Sports: 'Deportes',
  Supernatural: 'Sobrenatural',
  Thriller: 'Thriller',
};

const FORMAT_ES: Record<string, string> = {
  TV: 'Series TV',
  TV_SHORT: 'Cortos',
  MOVIE: 'Películas',
  SPECIAL: 'Especiales',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Música',
};

/**
 * "Tu anime en cifras": las estadísticas que el fan quiere ver nada más entrar.
 * Componente de servidor, sin JS en cliente.
 */
export function StatsStrip({ statistics, entries, variant = 'charts' }: StatsStripProps): React.JSX.Element {
  const days = statistics.minutesWatched / 60 / 24;
  const completed = entries.filter((e) => e.status === 'COMPLETED' || e.status === 'REPEATING').length;
  const listCount = entries.length || statistics.count;

  // Estados
  const statusCounts = STATUS_SERIES.map((s) => ({
    ...s,
    count: entries.filter((e) => e.status === s.key || (s.key === 'COMPLETED' && e.status === 'REPEATING')).length,
  }));
  const statusTotal = statusCounts.reduce((a, s) => a + s.count, 0);

  // Géneros: AniList statistics si existen; si no, contados desde la lista
  const genreSource =
    statistics.genres && statistics.genres.length > 0
      ? statistics.genres.map((g) => ({ name: g.genre, count: g.count }))
      : Object.entries(
          entries
            .filter((e) => e.status !== 'PLANNING')
            .flatMap((e) => e.media.genres ?? [])
            .reduce<Record<string, number>>((acc, g) => ((acc[g] = (acc[g] ?? 0) + 1), acc), {})
        ).map(([name, count]) => ({ name, count }));
  const genres = [...genreSource].sort((a, b) => b.count - a.count).slice(0, 6);
  const genreMax = genres[0]?.count ?? 1;

  // Notas del 1 al 10 (formato POINT_10_DECIMAL)
  const scored = entries.filter((e) => e.score > 0);
  const histogram = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: scored.filter((e) => Math.min(10, Math.max(1, Math.round(e.score))) === i + 1).length,
  }));
  const histMax = Math.max(1, ...histogram.map((h) => h.count));
  const meanScore =
    statistics.meanScore > 0
      ? statistics.meanScore / 10
      : scored.length > 0
        ? scored.reduce((a, e) => a + e.score, 0) / scored.length
        : 0;

  // Formatos
  const formats = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      const f = e.media.format ?? 'TV';
      acc[f] = (acc[f] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const figures = [
    { label: 'Series en tu lista', value: nf.format(listCount), sub: `${nf.format(completed)} completadas` },
    { label: 'Episodios vistos', value: nf.format(statistics.episodesWatched), sub: `${nf.format(Math.round(statistics.minutesWatched / 60))} horas` },
    { label: 'Días de anime', value: nf1.format(days), sub: 'de visionado acumulado' },
    { label: 'Nota media', value: meanScore > 0 ? nf1.format(meanScore) : '—', sub: `${nf.format(scored.length)} series puntuadas` },
  ];

  const figureList = (className: string, light = false): React.JSX.Element => (
    <dl className={className}>
      {figures.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className={light ? 'text-sm text-white/70' : 'text-sm text-muted-foreground'}>{f.label}</dt>
          <dd className="mt-1 font-display text-3xl sm:text-4xl font-bold text-white tabular">{f.value}</dd>
          <dd className={light ? 'mt-0.5 text-xs text-white/60 tabular' : 'mt-0.5 text-xs text-muted-foreground tabular'}>{f.sub}</dd>
        </div>
      ))}
    </dl>
  );

  if (variant === 'figures') {
    return figureList('grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4', true);
  }

  return (
    <section aria-labelledby="stats-title" className="rounded-[18px] bg-card p-5 sm:p-7" style={{ boxShadow: 'var(--shadow-tile)' }}>
      <h2 id="stats-title" className="font-display text-lg sm:text-xl font-semibold text-white">
        Tu anime en cifras
      </h2>

      {figureList('mt-5 grid grid-cols-2 gap-x-6 gap-y-6 sm:hidden')}

      <div className="mt-8 grid gap-8 border-t border-white/[0.06] pt-7 sm:mt-5 sm:border-t-0 sm:pt-0 lg:grid-cols-3">
        {/* Géneros favoritos: una sola serie, un solo tono */}
        <figure className="min-w-0">
          <figcaption className="text-sm font-medium text-white">Tus géneros</figcaption>
          <ul className="mt-4 space-y-2.5">
            {genres.map((g) => (
              <li key={g.name} className="grid grid-cols-[minmax(0,7.5rem)_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{GENRE_ES[g.name] ?? g.name}</span>
                <span className="h-2.5 rounded-r-[4px] bg-[#c9cfdb]" style={{ width: `${(g.count / genreMax) * 100}%` }} title={`${GENRE_ES[g.name] ?? g.name}: ${g.count} series`} />
                <span className="text-right text-white tabular">{g.count}</span>
              </li>
            ))}
            {genres.length === 0 && <li className="text-sm text-muted-foreground">Aún no hay géneros que contar.</li>}
          </ul>
        </figure>

        {/* Estado de la lista: barra segmentada con leyenda y cifras */}
        <figure className="min-w-0">
          <figcaption className="text-sm font-medium text-white">Estado de tu lista</figcaption>
          <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={statusCounts.map((s) => `${s.label}: ${s.count}`).join(', ')}>
            {statusCounts
              .filter((s) => s.count > 0)
              .map((s) => (
                <span key={s.key} style={{ width: `${(s.count / Math.max(1, statusTotal)) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${s.count}`} />
              ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {statusCounts.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} aria-hidden="true" />
                  {s.label}
                </span>
                <span className="text-white tabular">{s.count}</span>
              </li>
            ))}
          </ul>
          {formats.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground tabular">
              {formats.map(([f, c]) => `${FORMAT_ES[f] ?? f} ${c}`).join(' · ')}
            </p>
          )}
        </figure>

        {/* Reparto de notas */}
        <figure className="min-w-0">
          <figcaption className="flex items-baseline justify-between text-sm font-medium text-white">
            Cómo puntúas
            <span className="text-xs font-normal text-muted-foreground tabular">{nf.format(scored.length)} notas</span>
          </figcaption>
          <div className="mt-4 flex h-28 items-end gap-1.5" role="img" aria-label={histogram.map((h) => `${h.score}: ${h.count}`).join(', ')}>
            {histogram.map((h) => (
              <div key={h.score} className="group/bar flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover/bar:opacity-100 tabular">{h.count}</span>
                <span
                  className="w-full rounded-t-[4px] bg-[#c9cfdb] transition-colors group-hover/bar:bg-white"
                  style={{ height: `${h.count === 0 ? 2 : Math.max(6, (h.count / histMax) * 100)}%`, opacity: h.count === 0 ? 0.25 : 1 }}
                  title={`Nota ${h.score}: ${h.count} series`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5 text-[10px] text-muted-foreground tabular">
            {histogram.map((h) => (
              <span key={h.score} className="flex-1 text-center">{h.score}</span>
            ))}
          </div>
        </figure>
      </div>
    </section>
  );
}
