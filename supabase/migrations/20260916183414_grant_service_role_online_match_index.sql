-- The match Worker writes the index as service_role. Create table plus
-- revoke-from-anon/authenticated does not leave service_role with DML.
grant all on table public.online_matches to service_role;
grant all on table public.online_match_players to service_role;
grant all on table public.online_match_occupancy to service_role;
