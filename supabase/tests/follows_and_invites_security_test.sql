BEGIN;

SELECT plan(70);

SELECT ok(
  NOT has_function_privilege('anon', 'public.follow_user(uuid)', 'EXECUTE'),
  'anonymous users cannot follow'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.follow_user(uuid)', 'EXECUTE'),
  'authenticated users can follow'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.user_follows', 'INSERT'),
  'authenticated users cannot insert follows directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.user_follows', 'DELETE'),
  'authenticated users cannot delete follows directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'private.user_invite_preferences', 'SELECT'),
  'authenticated users cannot read invite preferences directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'private.user_invite_preferences', 'INSERT'),
  'authenticated users cannot insert invite preferences directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'private.user_invite_preferences', 'UPDATE'),
  'authenticated users cannot update invite preferences directly'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.get_my_require_mutual_follow_for_invites()', 'EXECUTE'),
  'anonymous users cannot read invite privacy'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.set_my_require_mutual_follow_for_invites(boolean)', 'EXECUTE'),
  'anonymous users cannot update invite privacy'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.get_my_require_mutual_follow_for_invites()', 'EXECUTE'),
  'authenticated users can read their invite privacy'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.set_my_require_mutual_follow_for_invites(boolean)', 'EXECUTE'),
  'authenticated users can update their invite privacy'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.publish_online_match_index(uuid,uuid,uuid,text,text,text,jsonb,integer,smallint,timestamptz,timestamptz,timestamptz,timestamptz,text,uuid,jsonb,bigint,public.online_match_player_input[])', 'EXECUTE'),
  'authenticated users cannot publish the match index'
);

SELECT ok(
  has_function_privilege('service_role', 'public.publish_online_match_index(uuid,uuid,uuid,text,text,text,jsonb,integer,smallint,timestamptz,timestamptz,timestamptz,timestamptz,text,uuid,jsonb,bigint,public.online_match_player_input[])', 'EXECUTE'),
  'service_role can publish the match index'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.online_match_invites', 'INSERT'),
  'authenticated users cannot insert invites directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.online_match_invites', 'UPDATE'),
  'authenticated users cannot update invites directly'
);

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'host@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Host Player"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000012',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alice@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Alice Alpha"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000013',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bob@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Bob Beta"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000014',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cara@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Cara Recent"}'::jsonb,
    now(),
    now()
  );

UPDATE public.profiles SET display_name = 'Host Player'
WHERE user_id = '00000000-0000-4000-8000-000000000011';
UPDATE public.profiles SET display_name = 'Alice Alpha'
WHERE user_id = '00000000-0000-4000-8000-000000000012';
UPDATE public.profiles SET display_name = 'Bob Beta'
WHERE user_id = '00000000-0000-4000-8000-000000000013';
UPDATE public.profiles SET display_name = 'Cara Recent'
WHERE user_id = '00000000-0000-4000-8000-000000000014';

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000011',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000012') $$,
  'host can follow alice'
);

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000012') $$,
  'follow is idempotent before the cap'
);

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000013') $$,
  'host can follow bob'
);

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000014') $$,
  'host can follow cara'
);

SELECT throws_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000011') $$,
  '22023',
  'not allowed',
  'self follow is rejected'
);

SELECT throws_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000099') $$,
  '22023',
  'not allowed',
  'following a missing profile is a generic not allowed error'
);

SELECT throws_ok(
  $$
    insert into public.user_follows (follower_id, followee_id)
    values (
      '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000012'
    )
  $$,
  '42501',
  null,
  'direct follow inserts are denied'
);

SELECT is(
  public.is_following_user('00000000-0000-4000-8000-000000000012'),
  true,
  'is_following_user reports followed accounts'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000012',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    select count(*)::integer
    from public.user_follows
    where follower_id = '00000000-0000-4000-8000-000000000011'
  ),
  0,
  'followers cannot read another users follow graph'
);

SELECT is(
  public.get_my_require_mutual_follow_for_invites(),
  true,
  'missing invite privacy rows default to requiring mutual follows'
);

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000011') $$,
  'alice can follow the host for mutual invites'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000013',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000011') $$,
  'bob can follow the host for mutual invites'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000014',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000011') $$,
  'cara can follow the host for mutual invites'
);

RESET ROLE;

INSERT INTO public.online_matches (
  id,
  invite_token,
  creator_user_id,
  status,
  play_mode,
  mode,
  config,
  legs_to_win,
  starting_player_slot,
  completed_at,
  ending_kind,
  winner_user_id,
  result_payload,
  index_version
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000011',
    'completed',
    'synchronous',
    'x01',
    '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
    1,
    0,
    now() - interval '1 day',
    'checkout',
    '00000000-0000-4000-8000-000000000011',
    '{}'::jsonb,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000011',
    'completed',
    'synchronous',
    'x01',
    '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
    1,
    0,
    now() - interval '1 day',
    'checkout',
    '00000000-0000-4000-8000-000000000011',
    '{}'::jsonb,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000011',
    'completed',
    'synchronous',
    'x01',
    '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
    1,
    0,
    now() - interval '2 days',
    'checkout',
    '00000000-0000-4000-8000-000000000011',
    '{}'::jsonb,
    1
  ),
  (
    '20000000-0000-4000-8000-000000000010',
    '30000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000011',
    'waiting',
    'synchronous',
    'x01',
    '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
    1,
    0,
    null,
    null,
    null,
    null,
    1
  );

INSERT INTO public.online_match_players (match_id, user_id, slot)
VALUES
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 0),
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', 1),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011', 0),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000014', 1),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000011', 0),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000013', 1),
  ('20000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011', 0);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000011',
  true
);
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$
    select display_name, play_count
    from public.list_followed_players_for_invite(null, 50, now(), null, null, null)
  $$,
  $$
    values
      ('Cara Recent'::text, 2),
      ('Bob Beta'::text, 1),
      ('Alice Alpha'::text, 0)
  $$,
  'followed invite list ranks by decayed frequency then alphabetical ties'
);

SELECT lives_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000012'
    )
  $$,
  'host can invite a followed player'
);

SELECT lives_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000013'
    )
  $$,
  'host can invite a second followed player'
);

SELECT throws_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000012'
    )
  $$,
  '23505',
  'already invited',
  'duplicate pending invites for the same lobby are rejected'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000012',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    select count(*)::integer
    from public.list_my_pending_online_match_invites()
  ),
  1,
  'invitee can list their pending invite'
);

SELECT results_eq(
  $$
    select match_id, invite_token is not null, outcome
    from public.respond_online_match_invite(
      (
        select invite_id
        from public.list_my_pending_online_match_invites()
        limit 1
      ),
      true
    )
  $$,
  $$ values ('20000000-0000-4000-8000-000000000010'::uuid, true, 'accepted_for_join'::text) $$,
  'accept returns join payload and leaves invite pending'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where invitee_id = '00000000-0000-4000-8000-000000000012'
      and match_id = '20000000-0000-4000-8000-000000000010'
  ),
  'pending',
  'accept leaves invite pending until index publish'
);

SELECT results_eq(
  $$
    select outcome, invite_token is null
    from public.respond_online_match_invite(
      (
        select invite_id
        from public.list_my_pending_online_match_invites()
        limit 1
      ),
      false
    )
  $$,
  $$ values ('unavailable'::text, true) $$,
  'decline cannot overwrite an invite after its join token was returned'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000013',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$
    select public.respond_online_match_invite(
      (
        select invite_id
        from public.list_my_pending_online_match_invites()
        limit 1
      ),
      false
    )
  $$,
  'invitee can decline an invite'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where invitee_id = '00000000-0000-4000-8000-000000000013'
      and match_id = '20000000-0000-4000-8000-000000000010'
  ),
  'declined',
  'decline marks the invite declined'
);

RESET ROLE;

-- Fill the lobby via the atomic publisher and supersede remaining pending invites.
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role","sub":"00000000-0000-4000-8000-000000000099"}',
  true
);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$
    select public.publish_online_match_index(
      '20000000-0000-4000-8000-000000000010'::uuid,
      '30000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000011'::uuid,
      'waiting',
      'synchronous',
      'x01',
      '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
      1,
      0::smallint,
      now(),
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::uuid,
      null::jsonb,
      2::bigint,
      array[
        row('00000000-0000-4000-8000-000000000011'::uuid, 0::smallint)::public.online_match_player_input,
        row('00000000-0000-4000-8000-000000000012'::uuid, 1::smallint)::public.online_match_player_input
      ]
    )
  $$,
  'service role can publish a filled waiting lobby'
);

SELECT lives_ok(
  $$
    select public.publish_online_match_index(
      '20000000-0000-4000-8000-000000000010'::uuid,
      '30000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000011'::uuid,
      'cancelled',
      'synchronous',
      'x01',
      '{"startScore":301,"doubleIn":false,"doubleOut":true}'::jsonb,
      1,
      0::smallint,
      now(),
      null::timestamptz,
      now(),
      null::timestamptz,
      'creator_cancel',
      null::uuid,
      null::jsonb,
      1::bigint,
      array[
        row('00000000-0000-4000-8000-000000000011'::uuid, 0::smallint)::public.online_match_player_input
      ]
    )
  $$,
  'a stale index publication returns without error'
);

RESET ROLE;

SELECT results_eq(
  $$
    select status, index_version, config ->> 'startScore'
    from public.online_matches
    where id = '20000000-0000-4000-8000-000000000010'
  $$,
  $$ values ('waiting'::text, 2::bigint, '501'::text) $$,
  'stale publication cannot overwrite newer match fields'
);

SELECT is(
  (
    select count(*)::integer
    from public.online_match_players
    where match_id = '20000000-0000-4000-8000-000000000010'
  ),
  2,
  'stale publication cannot replace newer match players'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where invitee_id = '00000000-0000-4000-8000-000000000012'
      and match_id = '20000000-0000-4000-8000-000000000010'
      and status = 'accepted'
  ),
  'accepted',
  'joined invitee becomes accepted through index publish'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where invitee_id = '00000000-0000-4000-8000-000000000013'
      and match_id = '20000000-0000-4000-8000-000000000010'
  ),
  'declined',
  'already declined invites stay declined after publish'
);

-- Stale accept persists superseded instead of rolling back.
INSERT INTO public.online_matches (
  id,
  invite_token,
  creator_user_id,
  status,
  play_mode,
  mode,
  config,
  legs_to_win,
  starting_player_slot,
  ending_kind,
  index_version
)
VALUES (
  '20000000-0000-4000-8000-000000000020',
  '30000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000011',
  'cancelled',
  'synchronous',
  'x01',
  '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
  1,
  0,
  'creator_cancel',
  1
);

INSERT INTO public.online_match_invites (match_id, inviter_id, invitee_id, status)
VALUES (
  '20000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000014',
  'pending'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000014',
  true
);
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$
    select outcome, invite_token is null
    from public.respond_online_match_invite(
      (
        select id
        from public.online_match_invites
        where match_id = '20000000-0000-4000-8000-000000000020'
          and invitee_id = '00000000-0000-4000-8000-000000000014'
      ),
      true
    )
  $$,
  $$ values ('unavailable'::text, true) $$,
  'stale accept returns unavailable without raising'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where match_id = '20000000-0000-4000-8000-000000000020'
      and invitee_id = '00000000-0000-4000-8000-000000000014'
  ),
  'superseded',
  'stale accept persists superseded'
);

RESET ROLE;

-- Open the seat again as service role for re-invite testing.
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role","sub":"00000000-0000-4000-8000-000000000099"}',
  true
);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;

DELETE FROM public.online_match_players
WHERE match_id = '20000000-0000-4000-8000-000000000010'
  AND user_id = '00000000-0000-4000-8000-000000000012';

DELETE FROM public.online_match_occupancy
WHERE match_id = '20000000-0000-4000-8000-000000000010'
  AND user_id = '00000000-0000-4000-8000-000000000012';

UPDATE public.online_matches
SET status = 'waiting', ending_kind = null, index_version = 3
WHERE id = '20000000-0000-4000-8000-000000000010';

RESET ROLE;

-- Re-invite after a resolved invite is allowed by pending-only uniqueness.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000011',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000013'
    )
  $$,
  'host can re-invite after a previous invite was resolved'
);

SELECT lives_ok(
  $$ select public.unfollow_user('00000000-0000-4000-8000-000000000012') $$,
  'host can unfollow'
);

SELECT is(
  public.is_following_user('00000000-0000-4000-8000-000000000012'),
  false,
  'unfollow clears follow state'
);

SELECT throws_ok(
  $$
    select public.publish_online_match_index(
      '20000000-0000-4000-8000-000000000010'::uuid,
      '30000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000011'::uuid,
      'waiting',
      'synchronous',
      'x01',
      '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
      1,
      0::smallint,
      now(),
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::uuid,
      null::jsonb,
      4::bigint,
      array[
        row('00000000-0000-4000-8000-000000000011'::uuid, 0::smallint)::public.online_match_player_input
      ]
    )
  $$,
  '42501',
  null,
  'authenticated callers cannot publish the match index'
);

RESET ROLE;

-- Mutual-follow invite privacy
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000012',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.set_my_require_mutual_follow_for_invites(false) $$,
  'alice can opt out of mutual-follow invites'
);

SELECT is(
  public.get_my_require_mutual_follow_for_invites(),
  false,
  'alice privacy preference persists as disabled'
);

RESET ROLE;

-- Host follows alice again; alice does not follow host.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000011',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000012') $$,
  'host can follow alice again after unfollowing'
);

SELECT lives_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000012'
    )
  $$,
  'one-way invites succeed when the invitee opted out of mutual follow'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000012',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.unfollow_user('00000000-0000-4000-8000-000000000011') $$,
  'alice can unfollow the host while opted out'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where match_id = '20000000-0000-4000-8000-000000000010'
      and invitee_id = '00000000-0000-4000-8000-000000000012'
      and status = 'pending'
  ),
  'pending',
  'unfollow while opted out leaves pending invites intact'
);

SELECT lives_ok(
  $$ select public.set_my_require_mutual_follow_for_invites(true) $$,
  'alice can re-enable mutual-follow protection'
);

SELECT is(
  (
    select count(*)::integer
    from public.online_match_invites
    where match_id = '20000000-0000-4000-8000-000000000010'
      and invitee_id = '00000000-0000-4000-8000-000000000012'
      and status = 'pending'
  ),
  0,
  'enabling mutual protection clears pending invites from non-followed hosts'
);

SELECT ok(
  exists (
    select 1
    from public.online_match_invites
    where match_id = '20000000-0000-4000-8000-000000000010'
      and invitee_id = '00000000-0000-4000-8000-000000000012'
      and status = 'superseded'
  ),
  'enabling mutual protection marks blocked pending invites superseded'
);

SELECT lives_ok(
  $$ select public.follow_user('00000000-0000-4000-8000-000000000011') $$,
  'alice can follow the host again'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000011',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000012'
    )
  $$,
  'mutual follow allows a new invite after protection is enabled'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000012',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.unfollow_user('00000000-0000-4000-8000-000000000011') $$,
  'alice can unfollow the host while protection is on'
);

SELECT is(
  (
    select status
    from public.online_match_invites
    where match_id = '20000000-0000-4000-8000-000000000010'
      and invitee_id = '00000000-0000-4000-8000-000000000012'
      and status = 'pending'
  ),
  NULL,
  'unfollow while protected supersedes pending invites from that host'
);

SELECT results_eq(
  $$
    select outcome, invite_token is null
    from public.respond_online_match_invite(
      (
        select id
        from public.online_match_invites
        where match_id = '20000000-0000-4000-8000-000000000010'
          and invitee_id = '00000000-0000-4000-8000-000000000012'
          and status = 'superseded'
        order by created_at desc, id desc
        limit 1
      ),
      true
    )
  $$,
  $$ values ('unavailable'::text, true) $$,
  'accepting a superseded mutual-blocked invite returns unavailable'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000011',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$
    select public.create_online_match_invite(
      '20000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000012'
    )
  $$,
  '22023',
  'invite not allowed',
  'one-way invites are rejected when the invitee requires mutual follow'
);

-- Turning protection off never revives resolved invites.
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000012',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.set_my_require_mutual_follow_for_invites(false) $$,
  'alice can disable mutual protection again'
);

SELECT is(
  (
    select count(*)::integer
    from public.online_match_invites
    where match_id = '20000000-0000-4000-8000-000000000010'
      and invitee_id = '00000000-0000-4000-8000-000000000012'
      and status = 'pending'
  ),
  0,
  'disabling mutual protection does not revive superseded invites'
);

RESET ROLE;

-- Account deletion cleans preference rows.
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000014',
  true
);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ select public.set_my_require_mutual_follow_for_invites(false) $$,
  'cara can store an invite privacy preference'
);

RESET ROLE;

SELECT lives_ok(
  $$
    delete from auth.users
    where id = '00000000-0000-4000-8000-000000000014'
  $$,
  'deleting an account succeeds'
);

SELECT is(
  (
    select count(*)::integer
    from private.user_invite_preferences
    where user_id = '00000000-0000-4000-8000-000000000014'
  ),
  0,
  'invite preference rows cascade when the account is deleted'
);

SELECT * FROM finish();
ROLLBACK;
