-- Allow idle timeout as an online match ending kind (sync AFK cancel).
alter table public.online_matches
  drop constraint if exists online_matches_ending_kind_check;

alter table public.online_matches
  add constraint online_matches_ending_kind_check check (
    ending_kind is null
    or ending_kind in (
      'checkout',
      'async_result',
      'abandon',
      'async_timeout',
      'mutual_cancel',
      'lobby_timeout',
      'creator_cancel',
      'idle_timeout'
    )
  );

create or replace function public.list_my_online_match_history()
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
        and match.ending_kind in ('mutual_cancel', 'idle_timeout')
      )
    )
  order by match.completed_at desc nulls last, match.created_at desc;
$$;
