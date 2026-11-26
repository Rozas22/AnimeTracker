-- =====================================================================
-- Kurama Tracker · Privacidad de perfiles y analítica antigua
-- EJECUTAR SOLO DESPUÉS de desplegar el código de esta fase. Antes, un
-- usuario con perfil privado dejaría de ver sus propios datos en la web.
--
-- Qué hace:
--   1. analytics_events deja de ser legible o escribible desde el navegador.
--      No borra ninguna fila.
--   2. Con la clave pública solo se leen los perfiles públicos.
--   3. Trofeos y campeones de perfiles no públicos dejan de ser legibles.
-- El servidor usa la service role, que no se ve afectada por estas políticas.
-- Es idempotente: se puede ejecutar más de una vez.
-- =====================================================================

-- 1. Analítica antigua: solo servidor ----------------------------------
do $$
declare
  p record;
begin
  if to_regclass('public.analytics_events') is not null then
    alter table public.analytics_events enable row level security;
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'analytics_events'
    loop
      execute format('drop policy %I on public.analytics_events', p.policyname);
    end loop;
  end if;
end $$;

-- 2. Perfiles: solo los públicos --------------------------------------
drop policy if exists "Lectura publica" on public.users;
create policy "Lectura publica" on public.users
  for select to anon, authenticated
  using (coalesce(profile_visibility, 'public') = 'public');

-- 3. Trofeos y campeones: siguen la visibilidad de su perfil ----------
-- La subconsulta pasa por la política de users: solo encuentra perfiles públicos.
drop policy if exists "Lectura publica" on public.user_achievements;
create policy "Lectura publica" on public.user_achievements
  for select to anon, authenticated
  using (exists (select 1 from public.users u where u.anilist_id = user_achievements.anilist_id));

drop policy if exists "Lectura publica" on public.monthly_winners;
create policy "Lectura publica" on public.monthly_winners
  for select to anon, authenticated
  using (exists (select 1 from public.users u where u.anilist_id = monthly_winners.anilist_id));

notify pgrst, 'reload schema';
