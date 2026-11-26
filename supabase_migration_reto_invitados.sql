-- =====================================================================
-- Kurama Tracker · Reto diario sin cuenta
-- EJECUTAR ANTES de desplegar el código de esta fase: solo añade tablas,
-- una columna con valor por defecto y una función, así que la web actual
-- sigue funcionando igual. Se puede ejecutar más de una vez.
--
-- Qué hace:
--   1. guest_plays: partidas de invitado, con un identificador anónimo
--      guardado solo como hash. Nunca cuentan para la liga oficial.
--   2. challenge_plays.source: distingue la partida jugada con cuenta de
--      la partida de invitado conservada al iniciar sesión.
--   3. challenge_generation_locks: un solo servidor genera cada reto.
--   4. claim_guest_play: pasa la partida a la cuenta una sola vez.
-- Las tablas son solo del servidor: RLS activado y sin políticas.
-- =====================================================================

create table if not exists public.guest_plays (
  guest_hash       text        not null,
  day              date        not null,
  score            integer     not null default 0,
  results          jsonb       not null default '[]'::jsonb,
  round_state      jsonb,
  round_started_at timestamptz,
  finished_at      timestamptz,
  claimed_by       bigint,
  claimed_at       timestamptz,
  created_at       timestamptz not null default now(),
  primary key (guest_hash, day)
);
create index if not exists guest_plays_day on public.guest_plays (day);
alter table public.guest_plays enable row level security;

alter table public.challenge_plays
  add column if not exists source text not null default 'account';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'challenge_plays_source_check') then
    alter table public.challenge_plays
      add constraint challenge_plays_source_check check (source in ('account', 'guest'));
  end if;
end $$;

create table if not exists public.challenge_generation_locks (
  day       date        primary key,
  locked_at timestamptz not null default now()
);
alter table public.challenge_generation_locks enable row level security;

-- league_points = 0: la partida se conserva, pero no suma PL ni entra en el podio.
create or replace function public.claim_guest_play(p_guest_hash text, p_day date, p_anilist_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.guest_plays%rowtype;
  inserted integer;
begin
  select * into g
  from public.guest_plays
  where guest_hash = p_guest_hash and day = p_day
  for update;

  if not found then return 'none'; end if;
  if g.claimed_by is not null then
    return case when g.claimed_by = p_anilist_id then 'already' else 'taken' end;
  end if;

  insert into public.challenge_plays
    (anilist_id, day, score, results, round_state, round_started_at, finished_at, league_points, source)
  values
    (p_anilist_id, g.day, g.score, g.results, g.round_state, g.round_started_at, g.finished_at, 0, 'guest')
  on conflict (anilist_id, day) do nothing;
  get diagnostics inserted = row_count;

  update public.guest_plays
  set claimed_by = p_anilist_id, claimed_at = now()
  where guest_hash = p_guest_hash and day = p_day;

  return case when inserted = 1 then 'claimed' else 'account_played' end;
end;
$$;

revoke all on function public.claim_guest_play(text, date, bigint) from public, anon, authenticated;
grant execute on function public.claim_guest_play(text, date, bigint) to service_role;

notify pgrst, 'reload schema';
