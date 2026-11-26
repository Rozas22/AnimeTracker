'use server';

import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { getVerifiedAniListId } from '@/lib/session-server';
import { getAnimeMediaAction } from './franchise';

/** Traducciones nuevas por persona y hora en cada servidor (las ya hechas no cuentan). */
const MAX_PER_HOUR = 60;
const recent = new Map<number, { count: number; resetAt: number }>();

const clean = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

async function translate(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = `Traduce al español de España esta sinopsis de un anime. Usa un tono natural, no literal.
Mantén sin traducir los nombres de personajes, lugares, técnicas y títulos.
Si al final indica la fuente, por ejemplo "(Source: Crunchyroll)", escríbela como "(Fuente: Crunchyroll)".
Responde solo con la traducción, sin comillas ni comentarios.

${text}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  // Un fallo lanza error para que no se quede guardado en la caché
  if (!res.ok || !out) throw new Error(`Gemini no devolvió traducción (${res.status})`);
  return out;
}

/**
 * Sinopsis en español de un anime. Se traduce una sola vez por anime y versión
 * del texto y se guarda 30 días en la caché del servidor. El texto sale siempre
 * de AniList, nunca del navegador, para que nadie use esto como traductor gratis.
 */
export async function getSpanishSynopsisAction(mediaId: number): Promise<string | null> {
  const me = await getVerifiedAniListId();
  if (!me) return null;
  const media = await getAnimeMediaAction(mediaId);
  const original = media?.description ? clean(media.description) : '';
  if (!original) return null;

  const version = createHash('sha256').update(original).digest('hex').slice(0, 16);
  const cached = unstable_cache(() => translate(original), ['sinopsis-es', String(media!.id), version], {
    revalidate: 60 * 60 * 24 * 30,
    tags: ['sinopsis-es'],
  });

  const now = Date.now();
  if (recent.size > 5000) recent.clear();
  const entry = recent.get(me);
  if (entry && entry.resetAt > now && entry.count >= MAX_PER_HOUR) return null;
  try {
    const started = Date.now();
    const text = await cached();
    // Solo cuenta si ha llamado de verdad a Gemini (lo cacheado vuelve al instante)
    if (Date.now() - started > 400) {
      const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + 3_600_000 };
      recent.set(me, { ...current, count: current.count + 1 });
    }
    return text;
  } catch (e) {
    console.warn('[sinopsis]', e instanceof Error ? e.message : e);
    return null;
  }
}
