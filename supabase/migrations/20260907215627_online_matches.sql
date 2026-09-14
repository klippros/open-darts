create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.online_matches (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null unique default gen_random_uuid(),
  creator_user_id uuid not null references auth.users (id) on delete restrict,
  status text not null check (status in ('waiting', 'active', 'completed', 'cancelled')),
  play_mode text not null check (play_mode in ('synchronous', 'asynchronous')),
  mode text not null check (
    mode in ('x01', 'bob27', '121', 'around-the-clock', '10-up-1-down')
  ),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  legs_to_win integer not null check (legs_to_win between 1 and 15),
  -- 2 is random first-throw preference until the match begins and resolves to 0 or 1.
  starting_player_slot smallint not null check (starting_player_slot in (0, 1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  async_started_at timestamptz,
  ending_kind text check (
    ending_kind in (
      'checkout',
      'async_result',
      'abandon',
      'async_timeout',
      'mutual_cancel',
      'lobby_timeout',
      'creator_cancel'
    )
  ),
  winner_user_id uuid references auth.users (id) on delete set null,
  result_payload jsonb,
  constraint online_matches_terminal_fields check (
    (
      status in ('waiting', 'active')
      and ending_kind is null
      and winner_user_id is null
      and result_payload is null
      and completed_at is null
    )
    or (
      status in ('completed', 'cancelled')
      and ending_kind is not null
    )
  )
);

create table public.online_match_players (
  match_id uuid not null references public.online_matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null check (slot in (0, 1)),
  joined_at timestamptz not null default now(),
  abandoned_at timestamptz,
  finalized_at timestamptz,
  primary key (match_id, user_id),
  unique (match_id, slot)
);

-- One in-progress online match per account. The Worker inserts on create/join
-- and deletes when the match becomes terminal.
create table public.online_match_occupancy (
  user_id uuid primary key references auth.users (id) on delete cascade,
  match_id uuid not null references public.online_matches (id) on delete cascade
);

create index online_match_players_user_id_idx
  on public.online_match_players (user_id);

create index online_matches_status_idx
  on public.online_matches (status);

create index online_matches_mode_idx
  on public.online_matches (mode);

create index online_matches_creator_user_id_idx
  on public.online_matches (creator_user_id);

create index online_matches_winner_user_id_idx
  on public.online_matches (winner_user_id);

create index online_match_occupancy_match_id_idx
  on public.online_match_occupancy (match_id);

alter table public.online_matches enable row level security;
alter table public.online_match_players enable row level security;
alter table public.online_match_occupancy enable row level security;

revoke all on public.online_matches from anon, authenticated;
revoke all on public.online_match_players from anon, authenticated;
revoke all on public.online_match_occupancy from anon, authenticated;

grant select on public.online_matches to authenticated;
grant select on public.online_match_players to authenticated;

-- online_match_players policies that subquery the same table recurse under RLS.
-- Route membership checks through a security definer helper instead.
create function private.is_online_match_member(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.online_match_players as membership
    where membership.match_id = p_match_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_online_match_member(uuid) from public, anon;
grant execute on function private.is_online_match_member(uuid) to authenticated;

create policy "Users can read online matches they belong to"
  on public.online_matches
  for select
  to authenticated
  using (private.is_online_match_member(id));

create policy "Users can read players in their online matches"
  on public.online_match_players
  for select
  to authenticated
  using (private.is_online_match_member(match_id));

drop policy "Users can read their profile" on public.profiles;

create policy "Users can read their profile or online match opponents"
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.online_match_players as membership
      where membership.user_id = profiles.user_id
        and private.is_online_match_member(membership.match_id)
    )
  );

create trigger set_online_matches_updated_at
  before update on public.online_matches
  for each row execute function public.set_updated_at();

create type public.online_match_invite as (
  match_id uuid,
  status text,
  creator_user_id uuid,
  creator_display_name text,
  mode text,
  config jsonb,
  legs_to_win integer,
  starting_player_slot smallint,
  player_count integer
);

create function private.lookup_online_match_invite(p_invite_token uuid)
returns setof public.online_match_invite
language sql
security definer
set search_path = ''
as $$
  select
    match.id,
    match.status,
    match.creator_user_id,
    profile.display_name,
    match.mode,
    match.config,
    match.legs_to_win,
    match.starting_player_slot,
    (
      select count(*)::integer
      from public.online_match_players as membership
      where membership.match_id = match.id
    ) as player_count
  from public.online_matches as match
  join public.profiles as profile
    on profile.user_id = match.creator_user_id
  where match.invite_token = p_invite_token
    and match.status = 'waiting';
$$;

revoke all on function private.lookup_online_match_invite(uuid) from public, anon, authenticated;

create function public.lookup_online_match_invite(p_invite_token uuid)
returns setof public.online_match_invite
language sql
security definer
set search_path = ''
as $$
  select *
  from private.lookup_online_match_invite(p_invite_token);
$$;

revoke all on function public.lookup_online_match_invite(uuid) from public, anon;

grant execute on function public.lookup_online_match_invite(uuid) to authenticated;

create function public.get_my_in_progress_online_match()
returns setof public.online_matches
language sql
security invoker
set search_path = ''
as $$
  select match.*
  from public.online_matches as match
  join public.online_match_players as membership
    on membership.match_id = match.id
  where membership.user_id = (select auth.uid())
    and match.status in ('waiting', 'active');
$$;

revoke all on function public.get_my_in_progress_online_match() from public, anon;

grant execute on function public.get_my_in_progress_online_match() to authenticated;

create function public.list_my_online_match_history()
returns setof public.online_matches
language sql
security invoker
set search_path = ''
as $$
  select match.*
  from public.online_matches as match
  join public.online_match_players as membership
    on membership.match_id = match.id
  where membership.user_id = (select auth.uid())
    and (
      match.status = 'completed'
      or (
        match.status = 'cancelled'
        and match.ending_kind = 'mutual_cancel'
      )
    )
  order by match.completed_at desc nulls last, match.created_at desc;
$$;

revoke all on function public.list_my_online_match_history() from public, anon;

grant execute on function public.list_my_online_match_history() to authenticated;

-- Prevent local game_sessions sync from accepting an online match UUID.
-- SECURITY DEFINER so the online_matches existence check is not filtered by RLS
-- (invokers can only SELECT their own matches). Always stamp user_id from auth.uid().
create or replace function public.upsert_game_session(
  session_id uuid,
  session_mode text,
  session_status text,
  session_started_at timestamptz,
  session_completed_at timestamptz,
  session_client_updated_at timestamptz,
  session_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'not_authenticated'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.online_matches as match
    where match.id = session_id
  ) then
    raise exception 'online_match_id_not_allowed'
      using errcode = 'check_violation';
  end if;

  insert into public.game_sessions (
    id,
    user_id,
    mode,
    status,
    started_at,
    completed_at,
    client_updated_at,
    payload
  )
  values (
    session_id,
    actor_id,
    session_mode,
    session_status,
    session_started_at,
    session_completed_at,
    session_client_updated_at,
    session_payload
  )
  on conflict (user_id, id) do update
  set
    mode = excluded.mode,
    status = excluded.status,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    client_updated_at = excluded.client_updated_at,
    payload = excluded.payload
  where public.game_sessions.user_id = actor_id;

  return session_id;
end;
$$;

revoke all on function public.upsert_game_session(
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  jsonb
) from public, anon;

grant execute on function public.upsert_game_session(
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  jsonb
) to authenticated;
