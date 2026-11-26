-- =====================================================================
-- Kurama Tracker · Ligas privadas entre amigos
-- EJECUTAR ANTES de desplegar el código de esta fase: solo añade tablas y
-- funciones. No toca la liga oficial ni sus puntos. Se puede ejecutar más
-- de una vez.
--
-- Las ligas privadas no tienen premios ni pagos. Las tablas son solo del
-- servidor (RLS activado y sin políticas) y los límites se comprueban aquí
-- dentro para que dos peticiones a la vez no puedan saltárselos:
--   · 5 ligas creadas por usuario
--   · 20 ligas por usuario
--   · 50 miembros por liga
-- =====================================================================

create table if not exists public.private_leagues (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 3 and 40),
  invite_code text        not null unique,
  owner_id    bigint      not null,
  created_at  timestamptz not null default now()
);
create index if not exists private_leagues_owner on public.private_leagues (owner_id);

-- removed_at: expulsado. La fila se conserva para que no pueda volver a entrar.
create table if not exists public.private_league_members (
  league_id  uuid        not null references public.private_leagues (id) on delete cascade,
  anilist_id bigint      not null,
  member_key uuid        not null default gen_random_uuid() unique,
  joined_at  timestamptz not null default now(),
  removed_at timestamptz,
  primary key (league_id, anilist_id)
);
create index if not exists private_league_members_user
  on public.private_league_members (anilist_id) where removed_at is null;

alter table public.private_leagues enable row level security;
alter table public.private_league_members enable row level security;

create or replace function public.create_private_league(p_owner bigint, p_name text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('liga-usuario-' || p_owner, 0));
  if (select count(*) from public.private_leagues where owner_id = p_owner) >= 5 then
    return jsonb_build_object('status', 'max_owned');
  end if;
  if (select count(*) from public.private_league_members where anilist_id = p_owner and removed_at is null) >= 20 then
    return jsonb_build_object('status', 'max_joined');
  end if;

  insert into public.private_leagues (name, invite_code, owner_id)
  values (p_name, p_code, p_owner)
  returning id into v_id;
  insert into public.private_league_members (league_id, anilist_id) values (v_id, p_owner);
  return jsonb_build_object('status', 'ok', 'id', v_id);
exception when unique_violation then
  return jsonb_build_object('status', 'code_taken');
end;
$$;

create or replace function public.join_private_league(p_code text, p_user bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_league public.private_leagues%rowtype;
  v_member public.private_league_members%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('liga-usuario-' || p_user, 0));
  select * into v_league from public.private_leagues where invite_code = p_code for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select * into v_member from public.private_league_members where league_id = v_league.id and anilist_id = p_user;
  if found then
    if v_member.removed_at is not null then return jsonb_build_object('status', 'blocked'); end if;
    return jsonb_build_object('status', 'already', 'id', v_league.id);
  end if;

  if (select count(*) from public.private_league_members where anilist_id = p_user and removed_at is null) >= 20 then
    return jsonb_build_object('status', 'max_joined');
  end if;
  if (select count(*) from public.private_league_members where league_id = v_league.id and removed_at is null) >= 50 then
    return jsonb_build_object('status', 'full');
  end if;

  insert into public.private_league_members (league_id, anilist_id) values (v_league.id, p_user);
  return jsonb_build_object('status', 'ok', 'id', v_league.id);
end;
$$;

-- Si sale quien la creó, pasa al miembro más antiguo. Si no queda nadie, se borra.
create or replace function public.leave_private_league(p_league uuid, p_user bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_league public.private_leagues%rowtype;
  v_next bigint;
begin
  select * into v_league from public.private_leagues where id = p_league for update;
  if not found then return 'none'; end if;

  delete from public.private_league_members
  where league_id = p_league and anilist_id = p_user and removed_at is null;
  if not found then return 'none'; end if;

  if v_league.owner_id = p_user then
    select anilist_id into v_next
    from public.private_league_members
    where league_id = p_league and removed_at is null
    order by joined_at, anilist_id
    limit 1;
    if v_next is null then
      delete from public.private_leagues where id = p_league;
      return 'deleted';
    end if;
    update public.private_leagues set owner_id = v_next where id = p_league;
    return 'transferred';
  end if;
  return 'ok';
end;
$$;

create or replace function public.kick_private_league_member(p_league uuid, p_owner bigint, p_member_key uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_league public.private_leagues%rowtype;
  v_target bigint;
begin
  select * into v_league from public.private_leagues where id = p_league for update;
  if not found or v_league.owner_id <> p_owner then return 'forbidden'; end if;

  select anilist_id into v_target
  from public.private_league_members
  where league_id = p_league and member_key = p_member_key and removed_at is null;
  if v_target is null then return 'none'; end if;
  if v_target = p_owner then return 'self'; end if;

  update public.private_league_members
  set removed_at = now()
  where league_id = p_league and anilist_id = v_target;
  return 'ok';
end;
$$;

revoke all on function public.create_private_league(bigint, text, text) from public, anon, authenticated;
revoke all on function public.join_private_league(text, bigint) from public, anon, authenticated;
revoke all on function public.leave_private_league(uuid, bigint) from public, anon, authenticated;
revoke all on function public.kick_private_league_member(uuid, bigint, uuid) from public, anon, authenticated;
grant execute on function public.create_private_league(bigint, text, text) to service_role;
grant execute on function public.join_private_league(text, bigint) to service_role;
grant execute on function public.leave_private_league(uuid, bigint) to service_role;
grant execute on function public.kick_private_league_member(uuid, bigint, uuid) to service_role;

notify pgrst, 'reload schema';
