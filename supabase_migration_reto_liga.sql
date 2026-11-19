-- =====================================================================
-- Kurama Tracker · El Reto diario suma a la liga mensual
-- Guarda qué día ya repartió el bonus del podio (top 3), para no
-- repartirlo dos veces. Se puede ejecutar más de una vez.
-- =====================================================================
alter table public.daily_challenges add column if not exists podium_awarded_at timestamptz;
alter table public.daily_challenges add column if not exists podium jsonb;
alter table public.challenge_plays  add column if not exists league_points integer; -- null = aún sin sumar a la liga

notify pgrst, 'reload schema';
