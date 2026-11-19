'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Gift, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import type { MonthlyPrizeRow } from '@/types/database';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MAX_FILES = 5;

export interface AdminPrizePanelProps {
  /** Premio del mes actual, si ya existe */
  initialPrize: MonthlyPrizeRow | null;
}

/**
 * Panel de administración del premio mensual (solo se renderiza para el admin
 * verificado en el servidor; la ruta /admin/premios vuelve a comprobarlo).
 */
export function AdminPrizePanel({ initialPrize }: AdminPrizePanelProps): React.JSX.Element {
  const now = new Date();
  const [month, setMonth] = useState<number>(initialPrize?.month ?? now.getMonth() + 1);
  const [year, setYear] = useState<number>(initialPrize?.year ?? now.getFullYear());
  const [title, setTitle] = useState(initialPrize?.title ?? '');
  const [description, setDescription] = useState(initialPrize?.description ?? '');
  const [keep, setKeep] = useState<string[]>(initialPrize?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const total = keep.length + files.length;

  const onPick = (list: FileList | null): void => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...picked].slice(0, Math.max(0, MAX_FILES - keep.length)));
  };

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setStatus(null);
    if (!title.trim()) {
      setStatus({ kind: 'error', text: 'Ponle un título al premio.' });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('title', title.trim());
      fd.set('description', description.trim());
      fd.set('month', String(month));
      fd.set('year', String(year));
      keep.forEach((u) => fd.append('keep', u));
      files.forEach((f) => fd.append('files', f));
      const res = await fetch('/admin/premios', { method: 'POST', body: fd });
      const data = (await res.json()) as { success?: boolean; error?: string; prize?: MonthlyPrizeRow };
      if (!res.ok || !data.success) {
        setStatus({ kind: 'error', text: data.error ?? 'No se pudo guardar el premio.' });
        return;
      }
      setKeep(data.prize?.images ?? [...keep]);
      setFiles([]);
      setStatus({ kind: 'ok', text: `Premio de ${MONTHS[month - 1]} guardado. Ya aparece en la Arena.` });
    } catch {
      setStatus({ kind: 'error', text: 'Sin conexión: no se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="admin-prize-title" className="rounded-[18px] bg-card p-6 sm:p-7" style={{ boxShadow: 'var(--shadow-tile)' }}>
      <h2 id="admin-prize-title" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
        <Gift className="h-5 w-5 text-[#e3b341]" aria-hidden="true" />
        Premio de la liga
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Solo tú ves este panel. El premio aparece en la Arena para todos.</p>

      <form onSubmit={(e) => void save(e)} className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-muted-foreground">
              Mes
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="mt-1 h-11 w-full rounded-[10px] border border-white/10 bg-background px-3 text-white focus:border-kurama focus:outline-none">
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-muted-foreground">
              Año
              <input type="number" min={2024} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1 h-11 w-full rounded-[10px] border border-white/10 bg-background px-3 text-white tabular focus:border-kurama focus:outline-none" />
            </label>
          </div>
          <label className="block text-sm text-muted-foreground">
            Título
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Figura de Kurama edición limitada" className="mt-1 h-11 w-full rounded-[10px] border border-white/10 bg-background px-3 text-white placeholder:text-muted-foreground/60 focus:border-kurama focus:outline-none" />
          </label>
          <label className="block text-sm text-muted-foreground">
            Descripción
            <textarea value={description} maxLength={600} rows={4} onChange={(e) => setDescription(e.target.value)} placeholder="Qué incluye y cómo se entrega." className="mt-1 w-full rounded-[10px] border border-white/10 bg-background px-3 py-2.5 text-white placeholder:text-muted-foreground/60 focus:border-kurama focus:outline-none" />
          </label>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Fotos ({total} de {MAX_FILES})</p>
          <ul className="mt-2 grid grid-cols-3 gap-3">
            {keep.map((src) => (
              <li key={src} className="group relative aspect-square overflow-hidden rounded-[12px] bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setKeep((k) => k.filter((u) => u !== src))} aria-label="Quitar foto" className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-[#e04a66]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {previews.map((src, i) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-[12px] bg-background ring-1 ring-kurama/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} aria-label="Quitar foto nueva" className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-[#e04a66]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {total < MAX_FILES && (
              <li>
                <label className="grid aspect-square cursor-pointer place-items-center rounded-[12px] border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-kurama hover:text-white">
                  <span className="flex flex-col items-center gap-1 text-xs">
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />
                    Añadir
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => onPick(e.target.files)} />
                </label>
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP o AVIF · hasta 6 MB cada una.</p>

          <button type="submit" disabled={saving} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-kurama font-semibold text-ink transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? 'Guardando…' : 'Guardar premio'}
          </button>
          {status && (
            <p role="status" className={status.kind === 'ok' ? 'mt-3 text-sm text-kurama' : 'mt-3 text-sm text-[#ff6b81]'}>
              {status.text}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
