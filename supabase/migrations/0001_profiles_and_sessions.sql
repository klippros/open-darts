create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mode text not null,
  status text not null check (status = 'completed'),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  client_updated_at timestamptz not null,
  payload jsonb not null,
  primary key (user_id, id),
  constraint game_sessions_payload_matches_row check (
    payload ->> 'id' = id::text
    and payload ->> 'mode' = mode
    and payload ->> 'status' = status
  )
);

create index game_sessions_user_started_at_idx
  on public.game_sessions (user_id, started_at desc);

create index game_sessions_user_status_idx
  on public.game_sessions (user_id, status);

alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.game_sessions from anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant insert (user_id, display_name) on public.profiles to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

grant select on public.game_sessions to authenticated;
grant insert (
  id,
  mode,
  status,
  started_at,
  completed_at,
  client_updated_at,
  payload
) on public.game_sessions to authenticated;
grant update (
  mode,
  status,
  started_at,
  completed_at,
  client_updated_at,
  payload
) on public.game_sessions to authenticated;
grant delete on public.game_sessions to authenticated;

create policy "Users can read their profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their game sessions"
  on public.game_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their game sessions"
  on public.game_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their game sessions"
  on public.game_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their game sessions"
  on public.game_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

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
language sql
set search_path = ''
as $$
  insert into public.game_sessions (
    id,
    mode,
    status,
    started_at,
    completed_at,
    client_updated_at,
    payload
  )
  values (
    session_id,
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
  returning id;
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_game_sessions_updated_at
  before update on public.game_sessions
  for each row execute function public.set_updated_at();

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

  insert into public.profiles (user_id, display_name)
  values (new.id, left(profile_name, 100));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();
