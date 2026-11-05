-- Explicit online-match summary / detail contracts so list responses no longer
-- return invite_token or full result_payload rows.

create type public.online_match_summary as (
  id uuid,
  status text,
  play_mode text,
  mode text,
  x01_start_score integer,
  claim_the_board_aim_mode text,
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
  x01_start_score integer,
  claim_the_board_aim_mode text,
  legs_to_win integer,
  ending_kind text,
  winner_user_id uuid,
  creator_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz,
  player_user_ids uuid[],
  player_display_names text[],
  scorecard_version integer,
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
    case
      when match.mode = 'x01'
        and jsonb_typeof(match.config -> 'startScore') = 'number'
        then (match.config ->> 'startScore')::integer
      else null
    end,
    case
      when match.mode = 'claim-the-board'
        and jsonb_typeof(match.config -> 'aimMode') = 'string'
        then match.config ->> 'aimMode'
      else null
    end,
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

create table private.profile_history_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

revoke all on table private.profile_history_rate_limits from public, anon, authenticated;

create or replace function private.consume_profile_history_rate_limit(
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
  insert into private.profile_history_rate_limits (
    user_id,
    window_started_at,
    request_count
  )
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when private.profile_history_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then now()
      else private.profile_history_rate_limits.window_started_at
    end,
    request_count = case
      when private.profile_history_rate_limits.window_started_at
        <= now() - make_interval(secs => p_window_seconds)
        then 1
      else private.profile_history_rate_limits.request_count + 1
    end
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function private.consume_profile_history_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;

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
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if (p_before_completed_at is null) <> (p_before_id is null) then
    raise exception 'invalid cursor' using errcode = '22023';
  end if;

  if not private.consume_profile_history_rate_limit(caller, 60, 60) then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  return query
  select summary.*
  from private.list_online_match_summaries_for_user(
    p_user_id,
    p_before_completed_at,
    p_before_id,
    p_limit,
    null
  ) as summary;
end;
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

create or replace function private.sanitize_online_match_config(
  p_mode text,
  p_config jsonb
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case p_mode
    when 'x01' then jsonb_build_object(
      'startScore', p_config -> 'startScore',
      'doubleIn', p_config -> 'doubleIn',
      'doubleOut', p_config -> 'doubleOut'
    )
    when 'claim-the-board' then jsonb_build_object(
      'aimMode', p_config -> 'aimMode'
    )
    when 'hunter' then jsonb_build_object(
      'startingPlayerIndex', p_config -> 'startingPlayerIndex'
    )
    when 'bull-run' then jsonb_build_object(
      'targetScore', p_config -> 'targetScore'
    )
    else '{}'::jsonb
  end;
$$;

revoke all on function private.sanitize_online_match_config(text, jsonb)
  from public, anon, authenticated;

create or replace function private.sanitize_online_match_session(p_session jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_session) <> 'object' then null
    else jsonb_strip_nulls(jsonb_build_object(
      'id', p_session -> 'id',
      'mode', p_session -> 'mode',
      'config', private.sanitize_online_match_config(
        p_session ->> 'mode',
        coalesce(p_session -> 'config', '{}'::jsonb)
      ),
      'players', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', player -> 'id',
          'name', player -> 'name',
          'kind', player -> 'kind'
        ) order by player_ordinality)
        from jsonb_array_elements(
          case
            when jsonb_typeof(p_session -> 'players') = 'array'
              then p_session -> 'players'
            else '[]'::jsonb
          end
        )
          with ordinality as players(player, player_ordinality)
      ), '[]'::jsonb),
      'visits', coalesce((
        select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'visitIndex', visit -> 'visitIndex',
          'playerId', visit -> 'playerId',
          'darts', coalesce((
            select jsonb_agg(jsonb_build_object(
              'segment', case
                when dart #>> '{segment,type}' = 'number'
                  then jsonb_build_object(
                    'type', dart #> '{segment,type}',
                    'value', dart #> '{segment,value}'
                  )
                else jsonb_build_object('type', dart #> '{segment,type}')
              end,
              'multiplier', dart -> 'multiplier',
              'points', dart -> 'points',
              'timestamp', dart -> 'timestamp'
            ) order by dart_ordinality)
            from jsonb_array_elements(
              case
                when jsonb_typeof(visit -> 'darts') = 'array'
                  then visit -> 'darts'
                else '[]'::jsonb
              end
            )
              with ordinality as darts(dart, dart_ordinality)
          ), '[]'::jsonb),
          'visitScore', visit -> 'visitScore',
          'scoreBefore', visit -> 'scoreBefore',
          'scoreAfter', visit -> 'scoreAfter',
          'bust', visit -> 'bust',
          'checkout', visit -> 'checkout',
          'legIndex', visit -> 'legIndex',
          'inputMode', visit -> 'inputMode',
          'voided', visit -> 'voided',
          'metadata', case
            when jsonb_typeof(visit -> 'metadata') = 'object'
              then jsonb_strip_nulls(jsonb_build_object(
                'targetLabel', visit #> '{metadata,targetLabel}',
                'hit', visit #> '{metadata,hit}',
                'hitCount', visit #> '{metadata,hitCount}',
                'sharedTargetIndex', visit #> '{metadata,sharedTargetIndex}',
                'sharedTargetIndexAfter', visit #> '{metadata,sharedTargetIndexAfter}',
                'fieldIndex', visit #> '{metadata,fieldIndex}',
                'fieldIndexAfter', visit #> '{metadata,fieldIndexAfter}',
                'fieldNumber', visit #> '{metadata,fieldNumber}',
                'fieldNumberAfter', visit #> '{metadata,fieldNumberAfter}',
                'advances', visit #> '{metadata,advances}',
                'catch', visit #> '{metadata,catch}',
                'targetScore', visit #> '{metadata,targetScore}'
              ))
            else null
          end
        )) order by visit_ordinality)
        from jsonb_array_elements(
          case
            when jsonb_typeof(p_session -> 'visits') = 'array'
              then p_session -> 'visits'
            else '[]'::jsonb
          end
        )
          with ordinality as visits(visit, visit_ordinality)
      ), '[]'::jsonb),
      'status', p_session -> 'status',
      'startedAt', p_session -> 'startedAt',
      'completedAt', p_session -> 'completedAt',
      'finishedEarly', p_session -> 'finishedEarly',
      'matchProgress', case
        when jsonb_typeof(p_session -> 'matchProgress') = 'object'
          then jsonb_strip_nulls(jsonb_build_object(
            'legsToWin', p_session #> '{matchProgress,legsToWin}',
            'startingPlayerIndex', p_session #> '{matchProgress,startingPlayerIndex}',
            'currentLeg', p_session #> '{matchProgress,currentLeg}',
            'legWins', p_session #> '{matchProgress,legWins}',
            'legLosses', p_session #> '{matchProgress,legLosses}'
          ))
        else null
      end
    ))
  end;
$$;

revoke all on function private.sanitize_online_match_session(jsonb)
  from public, anon, authenticated;

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
    summary.x01_start_score,
    summary.claim_the_board_aim_mode,
    summary.legs_to_win,
    summary.ending_kind,
    summary.winner_user_id,
    summary.creator_user_id,
    summary.completed_at,
    summary.created_at,
    summary.player_user_ids,
    summary.player_display_names,
    1,
    case
      when jsonb_typeof(match.result_payload -> 'session') = 'object'
        then private.sanitize_online_match_session(match.result_payload -> 'session')
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

create index if not exists online_matches_history_completed_idx
  on public.online_matches (completed_at desc nulls last, id desc)
  where status in ('completed', 'cancelled');

alter table public.online_matches
  drop constraint if exists online_matches_result_payload_size_check;

alter table public.online_matches
  add constraint online_matches_result_payload_size_check
  check (
    result_payload is null
    or pg_column_size(result_payload) <= 524288
  )
  not valid;
