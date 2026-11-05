-- Explicit online-match summary / detail contracts so list responses no longer
-- return invite_token or full result_payload rows.

create type public.online_match_summary as (
  id uuid,
  status text,
  play_mode text,
  mode text,
  config jsonb,
  legs_to_win integer,
  ending_kind text,
  winner_user_id uuid,
  creator_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz,
  player_user_ids uuid[],
  player_display_names text[]
);

create type public.online_match_detail as (
  id uuid,
  status text,
  play_mode text,
  mode text,
  config jsonb,
  legs_to_win integer,
  ending_kind text,
  winner_user_id uuid,
  creator_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz,
  player_user_ids uuid[],
  player_display_names text[],
  session jsonb
);

create or replace function private.online_match_is_history_row(
  p_status text,
  p_ending_kind text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_status = 'completed'
    or (
      p_status = 'cancelled'
      and p_ending_kind in ('mutual_cancel', 'idle_timeout')
    );
$$;

revoke all on function private.online_match_is_history_row(text, text) from public, anon, authenticated;

create or replace function private.build_online_match_summary(p_match_id uuid)
returns public.online_match_summary
language sql
stable
security definer
set search_path = ''
as $$
  select
    match.id,
    match.status,
    match.play_mode,
    match.mode,
    match.config,
    match.legs_to_win,
    match.ending_kind,
    match.winner_user_id,
    match.creator_user_id,
    match.completed_at,
    match.created_at,
    coalesce(
      (
        select array_agg(membership.user_id order by membership.slot)
        from public.online_match_players as membership
        where membership.match_id = match.id
      ),
      '{}'::uuid[]
    ),
    coalesce(
      (
        select array_agg(coalesce(profile.display_name, 'Player') order by membership.slot)
        from public.online_match_players as membership
        left join public.profiles as profile
          on profile.user_id = membership.user_id
        where membership.match_id = match.id
      ),
      '{}'::text[]
    )
  from public.online_matches as match
  where match.id = p_match_id;
$$;

revoke all on function private.build_online_match_summary(uuid) from public, anon, authenticated;

create or replace function private.list_online_match_summaries_for_user(
  p_user_id uuid,
  p_before_completed_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30,
  p_completed_after timestamptz default null
)
returns setof public.online_match_summary
language sql
stable
security definer
set search_path = ''
as $$
  select private.build_online_match_summary(match.id)
  from public.online_matches as match
  join public.online_match_players as membership
    on membership.match_id = match.id
  where membership.user_id = p_user_id
    and private.online_match_is_history_row(match.status, match.ending_kind)
    and (
      p_completed_after is null
      or coalesce(match.completed_at, match.created_at) >= p_completed_after
    )
    and (
      p_before_completed_at is null
      or coalesce(match.completed_at, match.created_at) < p_before_completed_at
      or (
        coalesce(match.completed_at, match.created_at) = p_before_completed_at
        and p_before_id is not null
        and match.id < p_before_id
      )
    )
  order by coalesce(match.completed_at, match.created_at) desc, match.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 30));
$$;

revoke all on function private.list_online_match_summaries_for_user(
  uuid,
  timestamptz,
  uuid,
  integer,
  timestamptz
) from public, anon, authenticated;

create or replace function public.list_my_online_match_summaries(
  p_before_completed_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30,
  p_completed_after timestamptz default null
)
returns setof public.online_match_summary
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.list_online_match_summaries_for_user(
    (select auth.uid()),
    p_before_completed_at,
    p_before_id,
    p_limit,
    p_completed_after
  );
$$;

revoke all on function public.list_my_online_match_summaries(
  timestamptz,
  uuid,
  integer,
  timestamptz
) from public, anon;

grant execute on function public.list_my_online_match_summaries(
  timestamptz,
  uuid,
  integer,
  timestamptz
) to authenticated;

create or replace function public.list_user_online_matches(
  p_user_id uuid,
  p_before_completed_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30
)
returns setof public.online_match_summary
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from private.list_online_match_summaries_for_user(
    p_user_id,
    p_before_completed_at,
    p_before_id,
    p_limit,
    null
  )
  where (select auth.uid()) is not null;
$$;

revoke all on function public.list_user_online_matches(
  uuid,
  timestamptz,
  uuid,
  integer
) from public, anon;

grant execute on function public.list_user_online_matches(
  uuid,
  timestamptz,
  uuid,
  integer
) to authenticated;

create or replace function public.get_my_online_match_detail(p_match_id uuid)
returns setof public.online_match_detail
language sql
stable
security definer
set search_path = ''
as $$
  select
    summary.id,
    summary.status,
    summary.play_mode,
    summary.mode,
    summary.config,
    summary.legs_to_win,
    summary.ending_kind,
    summary.winner_user_id,
    summary.creator_user_id,
    summary.completed_at,
    summary.created_at,
    summary.player_user_ids,
    summary.player_display_names,
    case
      when jsonb_typeof(match.result_payload -> 'session') = 'object'
        then match.result_payload -> 'session'
      else null
    end
  from public.online_matches as match
  cross join lateral private.build_online_match_summary(match.id) as summary
  where match.id = p_match_id
    and private.is_online_match_member(match.id)
    and private.online_match_is_history_row(match.status, match.ending_kind);
$$;

revoke all on function public.get_my_online_match_detail(uuid) from public, anon;

grant execute on function public.get_my_online_match_detail(uuid) to authenticated;

-- Participant-only sessions for the Stats page. Returns only the caller's
-- history matches, optionally clipped by completed_after.
create or replace function public.list_my_online_match_sessions(
  p_completed_after timestamptz default null
)
returns table (
  id uuid,
  completed_at timestamptz,
  session jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    match.id,
    coalesce(match.completed_at, match.created_at) as completed_at,
    case
      when jsonb_typeof(match.result_payload -> 'session') = 'object'
        then match.result_payload -> 'session'
      else null
    end as session
  from public.online_matches as match
  join public.online_match_players as membership
    on membership.match_id = match.id
  where membership.user_id = (select auth.uid())
    and private.online_match_is_history_row(match.status, match.ending_kind)
    and (
      p_completed_after is null
      or coalesce(match.completed_at, match.created_at) >= p_completed_after
    )
  order by coalesce(match.completed_at, match.created_at) desc, match.id desc;
$$;

revoke all on function public.list_my_online_match_sessions(timestamptz) from public, anon;

grant execute on function public.list_my_online_match_sessions(timestamptz) to authenticated;

-- Replace the legacy setof-online_matches contract so invite_token and
-- result_payload are no longer returned by the history list RPC.
drop function if exists public.list_my_online_match_history();

create function public.list_my_online_match_history()
returns setof public.online_match_summary
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from public.list_my_online_match_summaries(null, null, 30, null);
$$;

revoke all on function public.list_my_online_match_history() from public, anon;
grant execute on function public.list_my_online_match_history() to authenticated;

create index if not exists online_match_players_user_completed_idx
  on public.online_match_players (user_id);

create index if not exists online_matches_history_completed_idx
  on public.online_matches (completed_at desc nulls last, id desc)
  where status in ('completed', 'cancelled');
