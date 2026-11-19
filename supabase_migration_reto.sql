-- =====================================================================
-- Kurama Tracker · Reto diario (minijuego de 5 rondas)
-- Ejecutar en Supabase → SQL Editor. Se puede ejecutar más de una vez.
-- Las dos tablas son solo del servidor: RLS activado y sin políticas, así
-- que desde el navegador no se pueden leer las respuestas ni tocar partidas.
-- =====================================================================

-- Un reto por día (UTC). `rounds` guarda las respuestas: nunca sale al navegador.
create table if not exists public.daily_challenges (
  day        date        primary key,
  rounds     jsonb       not null,
  created_at timestamptz not null default now()
);

-- Una partida por usuario y día.
create table if not exists public.challenge_plays (
  anilist_id       bigint      not null,
  day              date        not null,
  score            integer     not null default 0,
  results          jsonb       not null default '[]'::jsonb,
  round_state      jsonb,
  round_started_at timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now(),
  primary key (anilist_id, day)
);

create index if not exists challenge_plays_day_score on public.challenge_plays (day, score desc);

alter table public.daily_challenges enable row level security;
alter table public.challenge_plays  enable row level security;

notify pgrst, 'reload schema';
