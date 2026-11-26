-- =====================================================================
-- Kurama Tracker · Medición respetuosa con la privacidad
-- EJECUTAR ANTES de desplegar el código de esta fase. Se puede ejecutar
-- más de una vez.
--
-- metric_daily solo guarda totales por día: sin identificador, IP, cookie
-- ni usuario. La retención se calcula al consultarla, únicamente con
-- partidas de cuentas, y devuelve cifras agregadas.
-- Solo accede el servidor (RLS activado y sin políticas).
-- =====================================================================

create table if not exists public.metric_daily (
  day    date    not null,
  event  text    not null,
  source text    not null default 'all',
  count  bigint  not null default 0,
  primary key (day, event, source)
);
alter table public.metric_daily enable row level security;

create or replace function public.increment_metric(p_day date, p_event text, p_source text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.metric_daily (day, event, source, count)
  values (p_day, p_event, p_source, 1)
  on conflict (day, event, source) do update set count = public.metric_daily.count + 1;
$$;

-- Retención clásica: de quienes jugaron por primera vez el día D, cuántos jugaron
-- exactamente el día D+N. Solo cuenta días ya terminados y excluye al administrador.
create or replace function public.metric_retention(p_exclude bigint, p_today date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with plays as (
    select distinct anilist_id, day
    from public.challenge_plays
    where finished_at is not null and anilist_id <> p_exclude
  ),
  firsts as (
    select anilist_id, min(day) as first_day from plays group by anilist_id
  ),
  horizons as (
    select unnest(array[1, 7, 30]) as n
  ),
  cohort as (
    select h.n,
           count(*) filter (where f.first_day + h.n < p_today) as eligible,
           count(*) filter (
             where f.first_day + h.n < p_today
               and exists (select 1 from plays p where p.anilist_id = f.anilist_id and p.day = f.first_day + h.n)
           ) as retained
    from horizons h
    cross join firsts f
    group by h.n
  )
  select jsonb_build_object(
    'players', (select count(*) from firsts),
    'cohorts', coalesce((select jsonb_agg(jsonb_build_object('days', n, 'eligible', eligible, 'retained', retained) order by n) from cohort), '[]'::jsonb)
  );
$$;

revoke all on function public.increment_metric(date, text, text) from public, anon, authenticated;
revoke all on function public.metric_retention(bigint, date) from public, anon, authenticated;
grant execute on function public.increment_metric(date, text, text) to service_role;
grant execute on function public.metric_retention(bigint, date) to service_role;

notify pgrst, 'reload schema';
