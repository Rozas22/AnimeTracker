#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Genera una imagen con Gemini usando GEMINI_API_KEY de frontend/.env.local
//
// Uso:
//   node scripts/generar-imagen.mjs --out public/trophies/nv50.png --prompt "..."
//   node scripts/generar-imagen.mjs --out ... --prompt-file prompt.txt [--model gemini-2.5-flash-image]
//   node scripts/generar-imagen.mjs --list-models
//
// Junto a cada PNG guarda <archivo>.json con el prompt y el modelo (procedencia).
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvKey(name) {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(root, '.env.local');
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return null;
}

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const apiKey = readEnvKey('GEMINI_API_KEY');
if (!apiKey) {
  console.error('Falta GEMINI_API_KEY (en el entorno o en frontend/.env.local).');
  process.exit(1);
}

// Google AI Studio: la clave va como parámetro ?key= (funciona con claves "AIza" y "AQ.")
const isVertex = false;
const base = 'https://generativelanguage.googleapis.com/v1beta';
const headers = { 'Content-Type': 'application/json' };
const withKey = (url) => `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;

if (process.argv.includes('--list-models')) {
  const res = await fetch(withKey(`${base}/models?pageSize=200`), { headers });
  const json = await res.json();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, JSON.stringify(json.error ?? json));
    process.exit(1);
  }
  for (const m of json.models ?? []) {
    if (/image|imagen/i.test(m.name)) console.log(m.name, '·', (m.supportedGenerationMethods ?? []).join(','));
  }
  process.exit(0);
}

const out = arg('--out');
const prompt = arg('--prompt') ?? (arg('--prompt-file') ? readFileSync(resolve(arg('--prompt-file')), 'utf8') : undefined);
const model = arg('--model') ?? 'gemini-2.5-flash-image';

if (!out || !prompt) {
  console.error('Uso: --out <ruta.png> --prompt "<texto>" | --prompt-file <archivo> [--model <modelo>]');
  process.exit(1);
}

const res = await fetch(withKey(`${base}/models/${model}:generateContent`), {
  method: 'POST',
  headers,
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  }),
});
const json = await res.json();

if (!res.ok) {
  console.error(`Gemini respondió HTTP ${res.status}:`);
  console.error(JSON.stringify(json.error ?? json, null, 2));
  process.exit(2);
}

const parts = json.candidates?.[0]?.content?.parts ?? [];
const image = parts.find((p) => p.inlineData?.data);
if (!image) {
  console.error('Gemini no devolvió ninguna imagen. Respuesta de texto:', parts.map((p) => p.text).filter(Boolean).join(' '));
  console.error('finishReason:', json.candidates?.[0]?.finishReason, JSON.stringify(json.promptFeedback ?? {}));
  process.exit(3);
}

const outPath = resolve(root, out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(image.inlineData.data, 'base64'));
writeFileSync(
  `${outPath}.json`,
  JSON.stringify({ generator: isVertex ? 'vertex-ai-gemini' : 'gemini', model, prompt, createdAt: new Date().toISOString() }, null, 2)
);
console.log(`OK → ${out} (${image.inlineData.mimeType}, modelo ${model})`);
