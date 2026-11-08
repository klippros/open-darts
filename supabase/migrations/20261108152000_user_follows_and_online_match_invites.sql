-- One-way follows, directed online lobby invites, and versioned match index sync.

-- ---------------------------------------------------------------------------
-- Match index versioning
-- ---------------------------------------------------------------------------

alter table public.online_matches
  add column if not exists index_version bigint not null default 0;

-- ---------------------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------------------

create table public.user_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint user_follows_not_self check (follower_id <> followee_id)
);

create index user_follows_followee_id_idx
  on public.user_follows (followee_id);

alter table public.user_follows enable row level security;

revoke all on table public.user_follows from public, anon, authenticated;

grant select on table public.user_follows to authenticated;

create policy "Users can read their own follows"
  on public.user_follows
  for select
  to authenticated
  using ((select auth.uid()) = follower_id);

-- ---------------------------------------------------------------------------
-- Directed invites
-- ---------------------------------------------------------------------------

create table public.online_match_invites (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.online_matches (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'superseded')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  resolved_at timestamptz,
  constraint online_match_invites_not_self check (inviter_id <> invitee_id)
);

create unique index online_match_invites_pending_unique
  on public.online_match_invites (match_id, invitee_id)
  where status = 'pending';

create index online_match_invites_invitee_status_created_idx
  on public.online_match_invites (invitee_id, status, created_at desc);

create index online_match_invites_match_created_idx
  on public.online_match_invites (match_id, created_at);

alter table public.online_match_invites replica identity full;

alter table public.online_match_invites enable row level security;

revoke all on table public.online_match_invites from public, anon, authenticated;

grant select on table public.online_match_invites to authenticated;

create policy "Inviters and invitees can read their invites"
  on public.online_match_invites
  for select
  to authenticated
  using (
    (select auth.uid()) = inviter_id
    or (select auth.uid()) = invitee_id
  );

grant select, insert, update, delete on table public.online_match_invites to service_role;

alter publication supabase_realtime add table public.online_match_invites;

-- ---------------------------------------------------------------------------
-- Rate limits
-- ---------------------------------------------------------------------------

create table private.follow_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

revoke all on table private.follow_rate_limits from public, anon, authenticated;

create or replace function private.consume_follow_rate_limit(
  p_user_id uuid,
  p_limit integer default 60,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  insert into private.follow_rate_limits (user_id, window_started_at, request_count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when private.follow_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then now()
      else private.follow_rate_limits.window_started_at
    end,
    request_count = case
      when private.follow_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then 1
      else private.follow_rate_limits.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function private.consume_follow_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;

create table private.invite_list_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

revoke all on table private.invite_list_rate_limits from public, anon, authenticated;

create or replace function private.consume_invite_list_rate_limit(
  p_user_id uuid,
  p_limit integer default 60,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  insert into private.invite_list_rate_limits (user_id, window_started_at, request_count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when private.invite_list_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then now()
      else private.invite_list_rate_limits.window_started_at
    end,
    request_count = case
      when private.invite_list_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then 1
      else private.invite_list_rate_limits.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function private.consume_invite_list_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;

create table private.invite_create_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

revoke all on table private.invite_create_rate_limits from public, anon, authenticated;

create or replace function private.consume_invite_create_rate_limit(
  p_user_id uuid,
  p_limit integer default 30,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  insert into private.invite_create_rate_limits (user_id, window_started_at, request_count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when private.invite_create_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then now()
      else private.invite_create_rate_limits.window_started_at
    end,
    request_count = case
      when private.invite_create_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then 1
      else private.invite_create_rate_limits.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function private.consume_invite_create_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;

create index if not exists online_matches_status_completed_at_idx
  on public.online_matches (status, completed_at desc)
  where status = 'completed' and completed_at is not null;

-- ---------------------------------------------------------------------------
-- Result types
-- ---------------------------------------------------------------------------

create type public.followed_player_for_invite as (
  user_id uuid,
  display_name text,
  rank integer,
  relevance_score numeric,
  play_count integer,
  last_played_at timestamptz,
  ranked_at timestamptz
);

create type public.pending_online_match_invite as (
  invite_id uuid,
  match_id uuid,
  inviter_user_id uuid,
  inviter_display_name text,
  mode text,
  config jsonb,
  legs_to_win integer,
  created_at timestamptz
);

create type public.online_match_invite_host_row as (
  invite_id uuid,
  invitee_user_id uuid,
  invitee_display_name text,
  status text,
  created_at timestamptz,
  responded_at timestamptz,
  resolved_at timestamptz
);

create type public.online_match_invite_accept as (
  match_id uuid,
  invite_token uuid,
  outcome text
);

create type public.online_match_player_input as (
  user_id uuid,
  slot smallint
);

-- ---------------------------------------------------------------------------
-- Auth helper
-- ---------------------------------------------------------------------------

create or replace function private.require_authenticated_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return caller;
end;
$$;

revoke all on function private.require_authenticated_user()
  from public, anon, authenticated;

create or replace function private.require_service_role()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if jwt_role <> 'service_role' and current_user <> 'service_role' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_service_role()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Invite privacy preferences (private; missing row = require mutual)
-- ---------------------------------------------------------------------------

create table private.user_invite_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  require_mutual_follow_for_invites boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table private.user_invite_preferences enable row level security;

revoke all on table private.user_invite_preferences from public, anon, authenticated;

create or replace function private.lock_follow_users(p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_user_id uuid;
begin
  for locked_user_id in
    select distinct user_id
    from unnest(p_user_ids) as user_id
    where user_id is not null
    order by user_id
  loop
    perform pg_advisory_xact_lock(hashtextextended(locked_user_id::text || ':follow', 0));
  end loop;
end;
$$;

revoke all on function private.lock_follow_users(uuid[])
  from public, anon, authenticated;

create or replace function private.requires_mutual_follow_for_invites(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select preference.require_mutual_follow_for_invites
      from private.user_invite_preferences as preference
      where preference.user_id = p_user_id
    ),
    true
  );
$$;

revoke all on function private.requires_mutual_follow_for_invites(uuid)
  from public, anon, authenticated;

create or replace function private.invitee_allows_invite_from(
  p_invitee_id uuid,
  p_inviter_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_invitee_id is null or p_inviter_id is null then
    return false;
  end if;

  if not private.requires_mutual_follow_for_invites(p_invitee_id) then
    return true;
  end if;

  return exists (
    select 1
    from public.user_follows as follow
    where follow.follower_id = p_invitee_id
      and follow.followee_id = p_inviter_id
  );
end;
$$;

revoke all on function private.invitee_allows_invite_from(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.supersede_pending_invites_blocked_by_mutual_follow(
  p_invitee_id uuid,
  p_inviter_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_invitee_id is null then
    return;
  end if;

  if not private.requires_mutual_follow_for_invites(p_invitee_id) then
    return;
  end if;

  update public.online_match_invites as invite
  set
    status = 'superseded',
    resolved_at = coalesce(invite.resolved_at, now())
  where invite.invitee_id = p_invitee_id
    and invite.status = 'pending'
    and (p_inviter_id is null or invite.inviter_id = p_inviter_id)
    and not exists (
      select 1
      from public.user_follows as follow
      where follow.follower_id = invite.invitee_id
        and follow.followee_id = invite.inviter_id
    );
end;
$$;

revoke all on function private.supersede_pending_invites_blocked_by_mutual_follow(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.get_my_require_mutual_follow_for_invites()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
begin
  return private.requires_mutual_follow_for_invites(caller);
end;
$$;

revoke all on function private.get_my_require_mutual_follow_for_invites()
  from public, anon, authenticated;

create or replace function public.get_my_require_mutual_follow_for_invites()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.get_my_require_mutual_follow_for_invites();
$$;

revoke all on function public.get_my_require_mutual_follow_for_invites()
  from public, anon;
grant execute on function public.get_my_require_mutual_follow_for_invites()
  to authenticated;

create or replace function private.set_my_require_mutual_follow_for_invites(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
  previous_enabled boolean;
begin
  if p_enabled is null then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  perform private.lock_follow_users(array[caller]);

  previous_enabled := private.requires_mutual_follow_for_invites(caller);

  insert into private.user_invite_preferences (
    user_id,
    require_mutual_follow_for_invites,
    updated_at
  )
  values (caller, p_enabled, now())
  on conflict (user_id) do update
  set
    require_mutual_follow_for_invites = excluded.require_mutual_follow_for_invites,
    updated_at = now();

  if p_enabled and not previous_enabled then
    perform private.supersede_pending_invites_blocked_by_mutual_follow(caller, null);
  end if;

  return p_enabled;
end;
$$;

revoke all on function private.set_my_require_mutual_follow_for_invites(boolean)
  from public, anon, authenticated;

create or replace function public.set_my_require_mutual_follow_for_invites(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.set_my_require_mutual_follow_for_invites(p_enabled);
end;
$$;

revoke all on function public.set_my_require_mutual_follow_for_invites(boolean)
  from public, anon;
grant execute on function public.set_my_require_mutual_follow_for_invites(boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Follow RPCs
-- ---------------------------------------------------------------------------

create or replace function private.follow_user(p_followee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
  follow_count integer;
begin
  if p_followee_id is null or p_followee_id = caller then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  if not private.consume_follow_rate_limit(caller, 60, 60) then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.user_id = p_followee_id
  ) then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  perform private.lock_follow_users(array[caller]);

  if exists (
    select 1
    from public.user_follows as follow
    where follow.follower_id = caller
      and follow.followee_id = p_followee_id
  ) then
    return;
  end if;

  select count(*)::integer
  into follow_count
  from public.user_follows as follow
  where follow.follower_id = caller;

  if follow_count >= 500 then
    raise exception 'follow limit reached' using errcode = '54000';
  end if;

  insert into public.user_follows (follower_id, followee_id)
  values (caller, p_followee_id);
end;
$$;

revoke all on function private.follow_user(uuid) from public, anon, authenticated;

create or replace function public.follow_user(p_followee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.follow_user(p_followee_id);
end;
$$;

revoke all on function public.follow_user(uuid) from public, anon;
grant execute on function public.follow_user(uuid) to authenticated;

create or replace function private.unfollow_user(p_followee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
begin
  if p_followee_id is null then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  perform private.lock_follow_users(array[caller]);

  delete from public.user_follows as follow
  where follow.follower_id = caller
    and follow.followee_id = p_followee_id;

  perform private.supersede_pending_invites_blocked_by_mutual_follow(caller, p_followee_id);
end;
$$;

revoke all on function private.unfollow_user(uuid) from public, anon, authenticated;

create or replace function public.unfollow_user(p_followee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.unfollow_user(p_followee_id);
end;
$$;

revoke all on function public.unfollow_user(uuid) from public, anon;
grant execute on function public.unfollow_user(uuid) to authenticated;

create or replace function public.is_following_user(p_followee_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_follows as follow
    where follow.follower_id = (select auth.uid())
      and follow.followee_id = p_followee_id
  );
$$;

revoke all on function public.is_following_user(uuid) from public, anon;
grant execute on function public.is_following_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ranked followed players
-- ---------------------------------------------------------------------------

create or replace function private.list_followed_players_for_invite(
  p_query text default null,
  p_limit integer default 50,
  p_ranked_at timestamptz default null,
  p_after_relevance_score numeric default null,
  p_after_display_name text default null,
  p_after_user_id uuid default null
)
returns setof public.followed_player_for_invite
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
  ranked_at timestamptz := coalesce(p_ranked_at, now());
  page_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  normalized_query text;
  escaped_query text;
  cursor_complete boolean :=
    (p_after_relevance_score is null)
    = (p_after_display_name is null)
    and (p_after_display_name is null)
    = (p_after_user_id is null);
begin
  if not cursor_complete then
    raise exception 'invalid cursor' using errcode = '22023';
  end if;

  if p_ranked_at is null
    and (
      p_after_relevance_score is not null
      or p_after_display_name is not null
      or p_after_user_id is not null
    )
  then
    raise exception 'invalid cursor' using errcode = '22023';
  end if;

  if not private.consume_invite_list_rate_limit(caller, 60, 60) then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  normalized_query := nullif(
    trim(both from regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')),
    ''
  );

  if normalized_query is not null then
    if char_length(normalized_query) > 30 then
      raise exception 'invalid query' using errcode = '22023';
    end if;

    escaped_query := replace(
      replace(replace(normalized_query, '\', '\\'), '%', '\%'),
      '_',
      '\_'
    );
  end if;

  return query
  with followed as (
    select
      follow.followee_id as user_id,
      profile.display_name,
      lower(profile.display_name) as display_name_key
    from public.user_follows as follow
    join public.profiles as profile
      on profile.user_id = follow.followee_id
    where follow.follower_id = caller
  ),
  shared_matches as (
    select
      opponent.user_id as user_id,
      count(*)::integer as play_count,
      max(match.completed_at) as last_played_at,
      round(
        coalesce(
          sum(
            power(
              0.5::numeric,
              greatest(
                extract(epoch from (ranked_at - match.completed_at)) / 86400.0 / 30.0,
                0
              )::numeric
            )
          ),
          0
        ),
        6
      ) as relevance_score
    from public.online_match_players as membership
    join public.online_matches as match
      on match.id = membership.match_id
    join public.online_match_players as opponent
      on opponent.match_id = match.id
     and opponent.user_id <> membership.user_id
    where membership.user_id = caller
      and match.status = 'completed'
      and match.completed_at is not null
      and match.completed_at <= ranked_at
      and exists (
        select 1
        from followed
        where followed.user_id = opponent.user_id
      )
    group by opponent.user_id
  ),
  ranked as (
    select
      followed.user_id,
      followed.display_name,
      followed.display_name_key,
      coalesce(shared_matches.relevance_score, 0::numeric) as relevance_score,
      coalesce(shared_matches.play_count, 0) as play_count,
      shared_matches.last_played_at,
      dense_rank() over (
        order by coalesce(shared_matches.relevance_score, 0::numeric) desc
      )::integer as rank
    from followed
    left join shared_matches
      on shared_matches.user_id = followed.user_id
  )
  select
    ranked.user_id,
    ranked.display_name,
    ranked.rank,
    ranked.relevance_score,
    ranked.play_count,
    ranked.last_played_at,
    ranked_at
  from ranked
  where (
    escaped_query is null
    or ranked.display_name ilike '%' || escaped_query || '%' escape '\'
  )
  and (
    p_after_user_id is null
    or ranked.relevance_score < p_after_relevance_score
    or (
      ranked.relevance_score = p_after_relevance_score
      and ranked.display_name_key > lower(p_after_display_name)
    )
    or (
      ranked.relevance_score = p_after_relevance_score
      and ranked.display_name_key = lower(p_after_display_name)
      and ranked.user_id > p_after_user_id
    )
  )
  order by
    ranked.relevance_score desc,
    ranked.display_name_key asc,
    ranked.user_id asc
  limit page_limit;
end;
$$;

revoke all on function private.list_followed_players_for_invite(
  text,
  integer,
  timestamptz,
  numeric,
  text,
  uuid
) from public, anon, authenticated;

create or replace function public.list_followed_players_for_invite(
  p_query text default null,
  p_limit integer default 50,
  p_ranked_at timestamptz default null,
  p_after_relevance_score numeric default null,
  p_after_display_name text default null,
  p_after_user_id uuid default null
)
returns setof public.followed_player_for_invite
language sql
security definer
set search_path = ''
as $$
  select *
  from private.list_followed_players_for_invite(
    p_query,
    p_limit,
    p_ranked_at,
    p_after_relevance_score,
    p_after_display_name,
    p_after_user_id
  );
$$;

revoke all on function public.list_followed_players_for_invite(
  text,
  integer,
  timestamptz,
  numeric,
  text,
  uuid
) from public, anon;

grant execute on function public.list_followed_players_for_invite(
  text,
  integer,
  timestamptz,
  numeric,
  text,
  uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- Invite helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_waiting_match_open(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.online_matches as match
    where match.id = p_match_id
      and match.status = 'waiting'
      and (
        select count(*)::integer
        from public.online_match_players as membership
        where membership.match_id = match.id
      ) = 1
  );
$$;

revoke all on function private.is_waiting_match_open(uuid)
  from public, anon, authenticated;

create or replace function private.lazily_supersede_stale_invites_for_invitee(p_invitee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.online_match_invites as invite
  set
    status = 'superseded',
    resolved_at = coalesce(invite.resolved_at, now())
  where invite.invitee_id = p_invitee_id
    and invite.status = 'pending'
    and not private.is_waiting_match_open(invite.match_id);

  perform private.supersede_pending_invites_blocked_by_mutual_follow(p_invitee_id, null);
end;
$$;

revoke all on function private.lazily_supersede_stale_invites_for_invitee(uuid)
  from public, anon, authenticated;

create or replace function private.create_online_match_invite(
  p_match_id uuid,
  p_invitee_id uuid
)
returns public.online_match_invite_host_row
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
  match_row public.online_matches;
  player_count integer;
  invite_count integer;
  pending_for_invitee integer;
  inserted public.online_match_invites;
  invitee_name text;
begin
  if p_match_id is null or p_invitee_id is null or p_invitee_id = caller then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  if not private.consume_invite_create_rate_limit(caller, 30, 3600) then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  perform private.lock_follow_users(array[caller, p_invitee_id]);

  select *
  into match_row
  from public.online_matches as match
  where match.id = p_match_id
  for update;

  if match_row.id is null then
    raise exception 'match not found' using errcode = 'P0002';
  end if;

  if match_row.status <> 'waiting' or match_row.creator_user_id <> caller then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select count(*)::integer
  into player_count
  from public.online_match_players as membership
  where membership.match_id = p_match_id;

  if player_count <> 1 then
    raise exception 'match is full' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.user_follows as follow
    where follow.follower_id = caller
      and follow.followee_id = p_invitee_id
  ) or not private.invitee_allows_invite_from(p_invitee_id, caller) then
    raise exception 'invite not allowed' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.online_match_players as membership
    where membership.match_id = p_match_id
      and membership.user_id = p_invitee_id
  ) then
    raise exception 'already seated' using errcode = '23514';
  end if;

  select count(*)::integer
  into invite_count
  from public.online_match_invites as invite
  where invite.match_id = p_match_id
    and invite.status = 'pending';

  if invite_count >= 10 then
    raise exception 'invite limit reached' using errcode = '54000';
  end if;

  select count(*)::integer
  into pending_for_invitee
  from public.online_match_invites as invite
  where invite.invitee_id = p_invitee_id
    and invite.status = 'pending';

  if pending_for_invitee >= 20 then
    raise exception 'invite inbox full' using errcode = '54000';
  end if;

  insert into public.online_match_invites (
    match_id,
    inviter_id,
    invitee_id,
    status
  )
  values (
    p_match_id,
    caller,
    p_invitee_id,
    'pending'
  )
  returning * into inserted;

  select profile.display_name
  into invitee_name
  from public.profiles as profile
  where profile.user_id = p_invitee_id;

  return (
    inserted.id,
    inserted.invitee_id,
    coalesce(invitee_name, 'Player'),
    inserted.status,
    inserted.created_at,
    inserted.responded_at,
    inserted.resolved_at
  )::public.online_match_invite_host_row;
exception
  when unique_violation then
    raise exception 'already invited' using errcode = '23505';
end;
$$;

revoke all on function private.create_online_match_invite(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.create_online_match_invite(
  p_match_id uuid,
  p_invitee_id uuid
)
returns public.online_match_invite_host_row
language sql
security definer
set search_path = ''
as $$
  select * from private.create_online_match_invite(p_match_id, p_invitee_id);
$$;

revoke all on function public.create_online_match_invite(uuid, uuid)
  from public, anon;
grant execute on function public.create_online_match_invite(uuid, uuid)
  to authenticated;

create or replace function private.list_my_pending_online_match_invites()
returns setof public.pending_online_match_invite
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
begin
  perform private.lazily_supersede_stale_invites_for_invitee(caller);

  return query
  select
    invite.id,
    invite.match_id,
    invite.inviter_id,
    coalesce(profile.display_name, 'Player'),
    match.mode,
    private.sanitize_online_match_config(match.mode, match.config),
    match.legs_to_win,
    invite.created_at
  from public.online_match_invites as invite
  join public.online_matches as match
    on match.id = invite.match_id
  join public.profiles as profile
    on profile.user_id = invite.inviter_id
  where invite.invitee_id = caller
    and invite.status = 'pending'
    and match.status = 'waiting'
    and (
      select count(*)::integer
      from public.online_match_players as membership
      where membership.match_id = match.id
    ) = 1
  order by invite.created_at desc, invite.id desc
  limit 20;
end;
$$;

revoke all on function private.list_my_pending_online_match_invites()
  from public, anon, authenticated;

create or replace function public.list_my_pending_online_match_invites()
returns setof public.pending_online_match_invite
language sql
security definer
set search_path = ''
as $$
  select * from private.list_my_pending_online_match_invites();
$$;

revoke all on function public.list_my_pending_online_match_invites()
  from public, anon;
grant execute on function public.list_my_pending_online_match_invites()
  to authenticated;

create or replace function private.list_online_match_invites_for_match(p_match_id uuid)
returns setof public.online_match_invite_host_row
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
begin
  if p_match_id is null then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.online_matches as match
    where match.id = p_match_id
      and match.creator_user_id = caller
  ) and not exists (
    select 1
    from public.online_match_invites as invite
    where invite.match_id = p_match_id
      and invite.inviter_id = caller
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    invite.id,
    invite.invitee_id,
    coalesce(profile.display_name, 'Player'),
    invite.status,
    invite.created_at,
    invite.responded_at,
    invite.resolved_at
  from public.online_match_invites as invite
  left join public.profiles as profile
    on profile.user_id = invite.invitee_id
  where invite.match_id = p_match_id
    and invite.inviter_id = caller
  order by invite.created_at asc, invite.id asc;
end;
$$;

revoke all on function private.list_online_match_invites_for_match(uuid)
  from public, anon, authenticated;

create or replace function public.list_online_match_invites_for_match(p_match_id uuid)
returns setof public.online_match_invite_host_row
language sql
security definer
set search_path = ''
as $$
  select * from private.list_online_match_invites_for_match(p_match_id);
$$;

revoke all on function public.list_online_match_invites_for_match(uuid)
  from public, anon;
grant execute on function public.list_online_match_invites_for_match(uuid)
  to authenticated;

create or replace function private.respond_online_match_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns public.online_match_invite_accept
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := private.require_authenticated_user();
  invite_row public.online_match_invites;
  match_row public.online_matches;
  target_match_id uuid;
  player_count integer;
begin
  if p_invite_id is null or p_accept is null then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  perform private.lock_follow_users(array[caller]);

  select *
  into invite_row
  from public.online_match_invites as invite
  where invite.id = p_invite_id
    and invite.invitee_id = caller;

  if invite_row.id is null then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  target_match_id := invite_row.match_id;

  -- Publication locks the match before resolving invites. Use the same order
  -- here so cancellation/seat publication cannot deadlock with a response.
  select *
  into match_row
  from public.online_matches as match
  where match.id = target_match_id
  for update;

  select *
  into invite_row
  from public.online_match_invites as invite
  where invite.id = p_invite_id
    and invite.invitee_id = caller
  for update;

  if invite_row.id is null then
    return (target_match_id, null::uuid, 'unavailable')::public.online_match_invite_accept;
  end if;

  if invite_row.status <> 'pending' then
    return (invite_row.match_id, null::uuid, 'unavailable')::public.online_match_invite_accept;
  end if;

  if not private.invitee_allows_invite_from(caller, invite_row.inviter_id) then
    update public.online_match_invites as invite
    set
      status = 'superseded',
      resolved_at = coalesce(invite.resolved_at, now())
    where invite.id = invite_row.id
      and invite.status = 'pending';

    return (invite_row.match_id, null::uuid, 'unavailable')::public.online_match_invite_accept;
  end if;

  if not p_accept then
    -- Once a join token has been returned, keep the invite pending until
    -- publication resolves the actual seat. A later decline cannot revoke the
    -- shared lobby token and would otherwise leave a seated invite declined.
    if invite_row.responded_at is not null then
      return (invite_row.match_id, null::uuid, 'unavailable')::public.online_match_invite_accept;
    end if;

    update public.online_match_invites as invite
    set
      status = 'declined',
      responded_at = now(),
      resolved_at = now()
    where invite.id = invite_row.id
      and invite.status = 'pending';

    if not found then
      return (invite_row.match_id, null::uuid, 'unavailable')::public.online_match_invite_accept;
    end if;

    return (invite_row.match_id, null::uuid, 'declined')::public.online_match_invite_accept;
  end if;

  if match_row.id is null or match_row.status <> 'waiting' then
    update public.online_match_invites as invite
    set
      status = 'superseded',
      resolved_at = coalesce(invite.resolved_at, now())
    where invite.id = invite_row.id
      and invite.status = 'pending';

    return (invite_row.match_id, null::uuid, 'unavailable')::public.online_match_invite_accept;
  end if;

  select count(*)::integer
  into player_count
  from public.online_match_players as membership
  where membership.match_id = match_row.id;

  if player_count <> 1 then
    update public.online_match_invites as invite
    set
      status = 'superseded',
      resolved_at = coalesce(invite.resolved_at, now())
    where invite.id = invite_row.id
      and invite.status = 'pending';

    return (match_row.id, null::uuid, 'unavailable')::public.online_match_invite_accept;
  end if;

  -- Leave status pending until match-server join publishes acceptance.
  update public.online_match_invites as invite
  set responded_at = coalesce(invite.responded_at, now())
  where invite.id = invite_row.id
    and invite.status = 'pending';

  return (match_row.id, match_row.invite_token, 'accepted_for_join')::public.online_match_invite_accept;
end;
$$;

revoke all on function private.respond_online_match_invite(uuid, boolean)
  from public, anon, authenticated;

create or replace function public.respond_online_match_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns public.online_match_invite_accept
language sql
security definer
set search_path = ''
as $$
  select * from private.respond_online_match_invite(p_invite_id, p_accept);
$$;

revoke all on function public.respond_online_match_invite(uuid, boolean)
  from public, anon;
grant execute on function public.respond_online_match_invite(uuid, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic versioned match index publish
-- ---------------------------------------------------------------------------

create or replace function private.publish_online_match_index(
  p_match_id uuid,
  p_invite_token uuid,
  p_creator_user_id uuid,
  p_status text,
  p_play_mode text,
  p_mode text,
  p_config jsonb,
  p_legs_to_win integer,
  p_starting_player_slot smallint,
  p_created_at timestamptz,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_async_started_at timestamptz,
  p_ending_kind text,
  p_winner_user_id uuid,
  p_result_payload jsonb,
  p_index_version bigint,
  p_players public.online_match_player_input[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_version bigint;
  player public.online_match_player_input;
begin
  perform private.require_service_role();

  if p_match_id is null or p_index_version is null or p_players is null then
    raise exception 'not allowed' using errcode = '22023';
  end if;

  -- A row lock cannot serialize concurrent first publication because the row
  -- does not exist yet. Lock the match identity before reading its version.
  perform pg_advisory_xact_lock(hashtextextended(p_match_id::text || ':index', 0));

  select match.index_version
  into existing_version
  from public.online_matches as match
  where match.id = p_match_id
  for update;

  if existing_version is not null and existing_version > p_index_version then
    return;
  end if;

  insert into public.online_matches (
    id,
    invite_token,
    creator_user_id,
    status,
    play_mode,
    mode,
    config,
    legs_to_win,
    starting_player_slot,
    created_at,
    started_at,
    completed_at,
    async_started_at,
    ending_kind,
    winner_user_id,
    result_payload,
    index_version
  )
  values (
    p_match_id,
    p_invite_token,
    p_creator_user_id,
    p_status,
    p_play_mode,
    p_mode,
    coalesce(p_config, '{}'::jsonb),
    p_legs_to_win,
    p_starting_player_slot,
    coalesce(p_created_at, now()),
    p_started_at,
    p_completed_at,
    p_async_started_at,
    p_ending_kind,
    p_winner_user_id,
    p_result_payload,
    p_index_version
  )
  on conflict (id) do update
  set
    invite_token = excluded.invite_token,
    creator_user_id = excluded.creator_user_id,
    status = excluded.status,
    play_mode = excluded.play_mode,
    mode = excluded.mode,
    config = excluded.config,
    legs_to_win = excluded.legs_to_win,
    starting_player_slot = excluded.starting_player_slot,
    created_at = excluded.created_at,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    async_started_at = excluded.async_started_at,
    ending_kind = excluded.ending_kind,
    winner_user_id = excluded.winner_user_id,
    result_payload = excluded.result_payload,
    index_version = excluded.index_version,
    updated_at = now();

  delete from public.online_match_players as membership
  where membership.match_id = p_match_id
    and (
      p_players is null
      or membership.user_id not in (
        select player_input.user_id
        from unnest(coalesce(p_players, array[]::public.online_match_player_input[])) as player_input
      )
    );

  if p_players is not null then
    foreach player in array p_players loop
      insert into public.online_match_players (match_id, user_id, slot)
      values (p_match_id, player.user_id, player.slot)
      on conflict (match_id, user_id) do update
      set slot = excluded.slot;
    end loop;
  end if;

  delete from public.online_match_occupancy as occupancy
  where occupancy.match_id = p_match_id;

  if p_status in ('waiting', 'active') and p_players is not null and cardinality(p_players) > 0 then
    begin
      insert into public.online_match_occupancy (user_id, match_id)
      select player_input.user_id, p_match_id
      from unnest(p_players) as player_input;
    exception
      when unique_violation then
        raise exception 'occupancy_conflict' using errcode = '23505';
    end;
  end if;

  if p_status in ('waiting', 'active') and p_players is not null and cardinality(p_players) >= 2 then
    update public.online_match_invites as invite
    set
      status = 'accepted',
      responded_at = coalesce(invite.responded_at, now()),
      resolved_at = coalesce(invite.resolved_at, now())
    where invite.match_id = p_match_id
      and invite.status = 'pending'
      and invite.invitee_id in (
        select player_input.user_id
        from unnest(p_players) as player_input
        where player_input.user_id <> p_creator_user_id
      );

    update public.online_match_invites as invite
    set
      status = 'superseded',
      resolved_at = coalesce(invite.resolved_at, now())
    where invite.match_id = p_match_id
      and invite.status = 'pending';
  elsif p_status in ('cancelled', 'completed') then
    update public.online_match_invites as invite
    set
      status = 'superseded',
      resolved_at = coalesce(invite.resolved_at, now())
    where invite.match_id = p_match_id
      and invite.status = 'pending';
  end if;
end;
$$;

revoke all on function private.publish_online_match_index(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  integer,
  smallint,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  uuid,
  jsonb,
  bigint,
  public.online_match_player_input[]
) from public, anon, authenticated;

create or replace function public.publish_online_match_index(
  p_match_id uuid,
  p_invite_token uuid,
  p_creator_user_id uuid,
  p_status text,
  p_play_mode text,
  p_mode text,
  p_config jsonb,
  p_legs_to_win integer,
  p_starting_player_slot smallint,
  p_created_at timestamptz,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_async_started_at timestamptz,
  p_ending_kind text,
  p_winner_user_id uuid,
  p_result_payload jsonb,
  p_index_version bigint,
  p_players public.online_match_player_input[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.publish_online_match_index(
    p_match_id,
    p_invite_token,
    p_creator_user_id,
    p_status,
    p_play_mode,
    p_mode,
    p_config,
    p_legs_to_win,
    p_starting_player_slot,
    p_created_at,
    p_started_at,
    p_completed_at,
    p_async_started_at,
    p_ending_kind,
    p_winner_user_id,
    p_result_payload,
    p_index_version,
    p_players
  );
end;
$$;

revoke all on function public.publish_online_match_index(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  integer,
  smallint,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  uuid,
  jsonb,
  bigint,
  public.online_match_player_input[]
) from public, anon, authenticated;

grant execute on function public.publish_online_match_index(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb,
  integer,
  smallint,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  uuid,
  jsonb,
  bigint,
  public.online_match_player_input[]
) to service_role;
