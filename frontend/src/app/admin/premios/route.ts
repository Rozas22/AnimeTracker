import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isVerifiedAdmin } from '@/lib/session-server';

const BUCKET = 'premios';
const MAX_FILES = 5;
const MAX_BYTES = 6 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * POST /admin/premios (multipart/form-data) — solo el admin verificado.
 * Campos: title, description, month, year, keep (URLs ya subidas que se conservan), files[]
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isVerifiedAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Formulario no válido.' }, { status: 400 });
  }

  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const month = Number(form.get('month'));
  const year = Number(form.get('year'));
  const keep = form.getAll('keep').map(String).filter((u) => u.startsWith('https://'));
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);

  if (!title || title.length > 120) return NextResponse.json({ error: 'El título es obligatorio (máx. 120 caracteres).' }, { status: 400 });
  if (description.length > 600) return NextResponse.json({ error: 'La descripción es demasiado larga (máx. 600).' }, { status: 400 });
  if (!(month >= 1 && month <= 12) || !(year >= 2024 && year <= 2100)) {
    return NextResponse.json({ error: 'Mes o año no válidos.' }, { status: 400 });
  }
  if (keep.length + files.length > MAX_FILES) {
    return NextResponse.json({ error: `Como mucho ${MAX_FILES} imágenes por premio.` }, { status: 400 });
  }
  for (const f of files) {
    if (!TYPES[f.type]) return NextResponse.json({ error: `«${f.name}» no es una imagen JPG, PNG, WebP o AVIF.` }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `«${f.name}» pesa más de 6 MB.` }, { status: 400 });
  }

  const supabase = createAdminClient();
  const uploaded: string[] = [];
  for (const [i, f] of files.entries()) {
    const path = `${year}-${String(month).padStart(2, '0')}/${Date.now()}-${i}.${TYPES[f.type]}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
    if (error) {
      return NextResponse.json(
        { error: /bucket/i.test(error.message) ? 'Falta crear el almacén «premios» en Supabase (ejecuta supabase_migration_seguridad.sql).' : error.message },
        { status: 500 }
      );
    }
    uploaded.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  const images = [...keep, ...uploaded];
  const now = new Date().toISOString();
  const { data: existing } = await supabase.from('monthly_prizes').select('id').eq('month', month).eq('year', year).limit(1);

  const row = { title, description, images, is_active: true, updated_at: now };
  const result = existing && existing.length > 0
    ? await supabase.from('monthly_prizes').update(row).eq('id', existing[0]!.id).select().single()
    : await supabase.from('monthly_prizes').insert({ ...row, month, year, created_at: now }).select().single();

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ success: true, prize: result.data });
}
