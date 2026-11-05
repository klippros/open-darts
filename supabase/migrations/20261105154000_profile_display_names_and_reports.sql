-- Tighten display names, blocklist moderation, and private name reports.

alter table public.profiles
  drop constraint if exists profiles_display_name_check;

update public.profiles
set display_name = left(display_name, 30)
where char_length(display_name) > 30;

alter table public.profiles
  add constraint profiles_display_name_check
  check (char_length(display_name) between 1 and 30);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'You'
  );

  -- Signup must not fail on provider names that fail the update trigger.
  profile_name := regexp_replace(profile_name, '[^[:alnum:] ]', '', 'g');
  profile_name := nullif(trim(both from regexp_replace(profile_name, '\s+', ' ', 'g')), '');
  profile_name := coalesce(left(profile_name, 30), 'You');

  insert into public.profiles (user_id, display_name)
  values (new.id, profile_name);

  return new;
end;
$$;

create or replace function private.normalize_display_name_for_blocklist(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    lower(regexp_replace(coalesce(p_name, ''), '\s+', '', 'g')),
    '01345@$!',
    'oieasasi'
  );
$$;

revoke all on function private.normalize_display_name_for_blocklist(text)
  from public, anon, authenticated;

create or replace function private.display_name_has_allowed_characters(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Unicode letters, numbers, and single spaces between words.
  select coalesce(p_name, '') ~ '^[[:alnum:]]+( [[:alnum:]]+)*$';
$$;

revoke all on function private.display_name_has_allowed_characters(text)
  from public, anon, authenticated;

create or replace function private.display_name_is_blocked(p_name text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized text := private.normalize_display_name_for_blocklist(p_name);
  token text;
  blocked_tokens text[] := array[
    'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'dick', 'piss',
    'slut', 'whore', 'faggot', 'nigger', 'nigga', 'retard', 'rape'
  ];
  slur_substrings text[] := array[
    'nigger', 'nigga', 'faggot'
  ];
begin
  if normalized is null or normalized = '' then
    return false;
  end if;

  foreach token in array blocked_tokens loop
    if normalized = token then
      return true;
    end if;
  end loop;

  foreach token in array string_to_array(
    regexp_replace(lower(coalesce(p_name, '')), '\s+', ' ', 'g'),
    ' '
  ) loop
    if token = any (blocked_tokens) then
      return true;
    end if;
  end loop;

  foreach token in array slur_substrings loop
    if position(token in normalized) > 0 then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

revoke all on function private.display_name_is_blocked(text)
  from public, anon, authenticated;

create or replace function private.enforce_display_name_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.display_name := trim(both from regexp_replace(new.display_name, '\s+', ' ', 'g'));

  if char_length(new.display_name) < 1 or char_length(new.display_name) > 30 then
    raise exception 'DISPLAY_NAME_LENGTH'
      using errcode = '22023';
  end if;

  if not private.display_name_has_allowed_characters(new.display_name) then
    raise exception 'DISPLAY_NAME_CHARS'
      using errcode = '22023';
  end if;

  if private.display_name_is_blocked(new.display_name) then
    raise exception 'DISPLAY_NAME_BLOCKED'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_display_name_rules() from public, anon, authenticated;

drop trigger if exists enforce_profiles_display_name on public.profiles;

create trigger enforce_profiles_display_name
  before update of display_name on public.profiles
  for each row
  execute function private.enforce_display_name_rules();

create table public.display_name_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  display_name_snapshot text not null check (char_length(display_name_snapshot) between 1 and 30),
  reason text not null check (reason = 'offensive_name'),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  moderation_outcome text,
  constraint display_name_reports_not_self check (reporter_user_id <> reported_user_id)
);

create unique index display_name_reports_open_unique
  on public.display_name_reports (
    reporter_user_id,
    reported_user_id,
    display_name_snapshot
  )
  where status = 'open';

create index display_name_reports_reported_user_idx
  on public.display_name_reports (reported_user_id, created_at desc);

alter table public.display_name_reports enable row level security;

revoke all on public.display_name_reports from anon, authenticated;

create or replace function public.report_display_name(p_reported_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter uuid := (select auth.uid());
  snapshot text;
  recent_count integer;
begin
  if reporter is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if reporter = p_reported_user_id then
    raise exception 'cannot report yourself' using errcode = '22023';
  end if;

  select profile.display_name
  into snapshot
  from public.profiles as profile
  where profile.user_id = p_reported_user_id;

  if snapshot is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into recent_count
  from public.display_name_reports as report
  where report.reporter_user_id = reporter
    and report.created_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'report rate limited' using errcode = '54000';
  end if;

  insert into public.display_name_reports (
    reporter_user_id,
    reported_user_id,
    display_name_snapshot,
    reason
  )
  values (reporter, p_reported_user_id, snapshot, 'offensive_name')
  on conflict (reporter_user_id, reported_user_id, display_name_snapshot)
  where status = 'open'
  do nothing;
end;
$$;

revoke all on function public.report_display_name(uuid) from public, anon;
grant execute on function public.report_display_name(uuid) to authenticated;

-- Service-role only: replace a reported name when it still matches the snapshot.
create or replace function private.moderate_reported_display_name(
  p_reported_user_id uuid,
  p_display_name_snapshot text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_name text;
  outcome text;
begin
  select profile.display_name
  into current_name
  from public.profiles as profile
  where profile.user_id = p_reported_user_id
  for update;

  if current_name is null then
    outcome := 'missing_profile';
  elsif current_name is distinct from p_display_name_snapshot then
    outcome := 'name_changed';
  else
    update public.profiles
    set display_name = 'Player'
    where user_id = p_reported_user_id;
    outcome := 'replaced';
  end if;

  update public.display_name_reports
  set
    status = 'closed',
    closed_at = now(),
    moderation_outcome = outcome
  where reported_user_id = p_reported_user_id
    and display_name_snapshot = p_display_name_snapshot
    and status = 'open';

  return outcome;
end;
$$;

revoke all on function private.moderate_reported_display_name(uuid, text)
  from public, anon, authenticated;

create index if not exists game_sessions_user_mode_completed_idx
  on public.game_sessions (user_id, mode, completed_at desc);

create table private.profile_stats_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0)
);

revoke all on table private.profile_stats_rate_limits from public, anon, authenticated;

create or replace function private.consume_profile_stats_rate_limit(
  p_user_id uuid,
  p_limit integer default 30,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  select window_started_at, request_count
  into current_window, current_count
  from private.profile_stats_rate_limits
  where user_id = p_user_id
  for update;

  if current_window is null then
    insert into private.profile_stats_rate_limits (user_id, window_started_at, request_count)
    values (p_user_id, now(), 1);
    return true;
  end if;

  if current_window <= now() - make_interval(secs => p_window_seconds) then
    update private.profile_stats_rate_limits
    set window_started_at = now(), request_count = 1
    where user_id = p_user_id;
    return true;
  end if;

  if current_count >= p_limit then
    return false;
  end if;

  update private.profile_stats_rate_limits
  set request_count = request_count + 1
  where user_id = p_user_id;

  return true;
end;
$$;

revoke all on function private.consume_profile_stats_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;

create or replace function public.consume_profile_stats_rate_limit()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.consume_profile_stats_rate_limit((select auth.uid()), 30, 60);
$$;

revoke all on function public.consume_profile_stats_rate_limit() from public, anon;
grant execute on function public.consume_profile_stats_rate_limit() to authenticated;

-- Cap future session payload size (~512 KiB) so profile aggregation stays bounded.
alter table public.game_sessions
  drop constraint if exists game_sessions_payload_size_check;

alter table public.game_sessions
  add constraint game_sessions_payload_size_check
  check (pg_column_size(payload) <= 524288);
