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
