-- Allow random first-throw preference (2) until the match begins and resolves to 0 or 1.
alter table public.online_matches
  drop constraint online_matches_starting_player_slot_check;

alter table public.online_matches
  add constraint online_matches_starting_player_slot_check
  check (starting_player_slot in (0, 1, 2));
