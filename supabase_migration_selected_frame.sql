-- ═══════════════════════════════════════════════════════════════════════════
-- KuramaTracker · Marco de avatar elegido por el usuario
-- Ejecutar una vez en Supabase → SQL Editor (proyecto de producción).
-- NULL = "Automático" (el marco más alto desbloqueado por nivel).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists selected_frame text
  check (
    selected_frame is null
    or selected_frame in ('none', 'bronze', 'silver', 'gold', 'ruby', 'diamond', 'chroma')
  );

comment on column public.users.selected_frame is
  'Marco de avatar elegido (null = automático según nivel). Validado contra el nivel en el servidor.';
