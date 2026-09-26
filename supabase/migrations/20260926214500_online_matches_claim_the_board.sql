-- Allow claim-the-board as an online match mode.
alter table public.online_matches
  drop constraint if exists online_matches_mode_check;

alter table public.online_matches
  add constraint online_matches_mode_check check (
    mode in (
      'x01',
      'bob27',
      '121',
      'around-the-clock',
      'claim-the-board',
      '10-up-1-down'
    )
  );
