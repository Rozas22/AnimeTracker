-- =====================================================================
-- Kurama Tracker · Migración de seguridad
-- EJECUTAR SOLO DESPUÉS de desplegar el código que escribe con la
-- service role (commit "fix(security): ..."). Si se ejecuta antes, la web
-- antigua dejará de poder guardar puntos, marcos y progreso.
--
-- Qué hace:
--   1. Activa RLS en todas las tablas de la app.
--   2. Borra TODAS las políticas antiguas de esas tablas (algunas permitían
--      escribir a cualquiera, p. ej. "Allow insert on quizzes").
--   3. Solo deja LECTURA pública donde la web la necesita. Nadie con la
--      clave pública (anon) puede escribir: las escrituras van por el
--      servidor con la service role, que se salta RLS.
--   4. Las preguntas del quiz (con la respuesta correcta) dejan de ser
--      legibles desde el navegador.
--   5. Crea quiz_answers (cada pregunta puntúa una sola vez por usuario).
--   6. Crea el almacén público de imágenes "premios".
-- Es idempotente: se puede ejecutar más de una vez.
-- =====================================================================

-- 1 + 2. RLS activado y políticas antiguas fuera ----------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'users', 'quizzes', 'user_achievements', 'monthly_winners',
    'monthly_prizes', 'push_subscriptions', 'quiz_history', 'cron_logs',
    'user_planning_animes'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end $$;

-- 3. Lectura pública donde hace falta ---------------------------------
-- Perfiles, ranking, grupo y Realtime de public.users necesitan SELECT.
do $$
declare
  t text;
begin
  foreach t in array array['users', 'user_achievements', 'monthly_winners', 'monthly_prizes'] loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'create policy "Lectura publica" on public.%I for select to anon, authenticated using (true)', t
      );
    end if;
  end loop;
end $$;

-- quizzes, push_subscriptions, quiz_history, cron_logs y
-- user_planning_animes quedan SIN políticas: solo el servidor accede.

-- 5. Anti-repetición del quiz -----------------------------------------
create table if not exists public.quiz_answers (
  anilist_id  bigint      not null,
  question_id text        not null,
  correct     boolean     not null default false,
  answered_at timestamptz not null default now(),
  primary key (anilist_id, question_id)
);
alter table public.quiz_answers enable row level security;

-- 6. Almacén de imágenes de premios -----------------------------------
-- Público para leer (las fotos se ven en la Arena); solo el servidor sube.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'premios', 'premios', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Refrescar la caché de esquema de la API
notify pgrst, 'reload schema';
