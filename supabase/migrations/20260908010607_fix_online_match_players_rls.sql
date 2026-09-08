-- online_match_players policies that subquery the same table recurse under RLS.
-- Route membership checks through a security definer helper instead.

create or replace function private.is_online_match_member(p_match_id uuid)
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

drop policy if exists "Users can read online matches they belong to" on public.online_matches;
drop policy if exists "Users can read players in their online matches" on public.online_match_players;
drop policy if exists "Users can read their profile or online match opponents" on public.profiles;

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
