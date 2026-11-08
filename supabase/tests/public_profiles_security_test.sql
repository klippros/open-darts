BEGIN;

SELECT plan(26);

SELECT ok(
  NOT has_function_privilege('anon', 'public.list_user_online_matches(uuid,timestamptz,uuid,integer)', 'EXECUTE'),
  'anonymous users cannot list public profile history'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.list_user_online_matches(uuid,timestamptz,uuid,integer)', 'EXECUTE'),
  'authenticated users can list public profile history'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.get_my_online_match_detail(uuid)', 'EXECUTE'),
  'anonymous users cannot fetch match details'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'private.moderate_reported_display_name(uuid,text)',
    'EXECUTE'
  ),
  'authenticated users cannot execute moderation'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'private.moderate_reported_display_name(uuid,text)',
    'EXECUTE'
  ),
  'anonymous users cannot execute moderation'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'private.display_name_reports', 'SELECT'),
  'report rows are private'
);

SELECT results_eq(
  $$
    select attname::text
    from pg_attribute
    where attrelid = 'public.online_match_summary'::regclass
      and attnum > 0
      and not attisdropped
      and attname in ('config', 'result_payload', 'invite_token', 'session')
    order by attname
  $$,
  $$ values (null::text) limit 0 $$,
  'history summary type has no raw config, payload, token, or session'
);

SELECT is(
  private.normalize_display_name_for_blocklist('  Jöhn   SH1T  '),
  'jöhn shit',
  'blocklist normalization preserves token boundaries and applies substitutions'
);

SELECT ok(
  private.display_name_is_blocked('Jöhn SH1T'),
  'normalized obfuscated profanity is blocked as a whole token'
);

SELECT ok(
  NOT private.display_name_is_blocked('Scunthorpe'),
  'ordinary profanity matching avoids innocent substrings'
);

SELECT throws_ok(
  $$ insert into public.profiles (user_id, display_name)
     values ('00000000-0000-4000-8000-000000000099', 'Valid Name') $$,
  '23503',
  null,
  'direct profile inserts still require an existing auth user'
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
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Viewer"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'reported@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Nice SH1T"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'unrelated@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Unrelated"}'::jsonb,
    now(),
    now()
  );

SELECT is(
  (
    select display_name
    from public.profiles
    where user_id = '00000000-0000-4000-8000-000000000002'
  ),
  'You',
  'signup falls back when provider metadata contains a blocked name'
);

SELECT throws_ok(
  $$ update public.profiles
     set display_name = 'Bad!Name'
     where user_id = '00000000-0000-4000-8000-000000000001' $$,
  '22023',
  'DISPLAY_NAME_CHARS',
  'direct updates reject punctuation'
);

SELECT throws_ok(
  $$ update public.profiles
     set display_name = 'Nice SH1T'
     where user_id = '00000000-0000-4000-8000-000000000001' $$,
  '22023',
  'DISPLAY_NAME_BLOCKED',
  'direct updates reject normalized blocked tokens'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ select public.report_display_name('00000000-0000-4000-8000-000000000001') $$,
  '22023',
  'cannot report yourself',
  'self reports are rejected'
);

SELECT lives_ok(
  $$ select public.report_display_name('00000000-0000-4000-8000-000000000002') $$,
  'an authenticated user can report another current display name'
);

SELECT lives_ok(
  $$ select public.report_display_name('00000000-0000-4000-8000-000000000002') $$,
  'duplicate open reports are idempotent'
);

SELECT throws_ok(
  $$
    select *
    from public.list_user_online_matches(
      '00000000-0000-4000-8000-000000000002',
      now(),
      null,
      30
    )
  $$,
  '22023',
  'invalid cursor',
  'profile history rejects half-specified cursors'
);

RESET ROLE;

SELECT is(
  (
    select count(*)::integer
    from private.display_name_reports
    where reporter_user_id = '00000000-0000-4000-8000-000000000001'
      and reported_user_id = '00000000-0000-4000-8000-000000000002'
      and status = 'open'
  ),
  1,
  'only one open report exists for the same name snapshot'
);

INSERT INTO public.online_matches (
  id,
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
  result_payload
)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'completed',
  'synchronous',
  'x01',
  '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
  1,
  0,
  now(),
  'checkout',
  '00000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'session',
    '{
      "id":"scorecard-session",
      "mode":"x01",
      "config":{"startScore":501,"doubleIn":false,"doubleOut":true},
      "players":[
        {"id":"00000000-0000-4000-8000-000000000001","name":"Viewer","kind":"human"},
        {"id":"00000000-0000-4000-8000-000000000002","name":"You","kind":"remote"}
      ],
      "visits":[],
      "status":"completed",
      "startedAt":"2026-01-01T00:00:00.000Z",
      "completedAt":"2026-01-01T00:15:00.000Z"
    }'::jsonb
  )
);

INSERT INTO public.online_match_players (match_id, user_id, slot)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    0
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    1
  );

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    select count(*)::integer
    from public.get_my_online_match_detail('10000000-0000-4000-8000-000000000001')
  ),
  1,
  'a participant can fetch the sanitized scorecard'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  true
);

SELECT is(
  (
    select count(*)::integer
    from public.get_my_online_match_detail('10000000-0000-4000-8000-000000000001')
  ),
  0,
  'an unrelated authenticated user cannot fetch the scorecard'
);

SELECT is(
  (
    select count(*)::integer
    from public.list_user_online_matches(
      '00000000-0000-4000-8000-000000000002',
      null,
      null,
      30
    )
  ),
  1,
  'an authenticated user can read another player public history summary'
);

RESET ROLE;

DELETE FROM private.profile_history_rate_limits
WHERE user_id = '00000000-0000-4000-8000-000000000003';

SELECT results_eq(
  $$
    select private.consume_profile_history_rate_limit(
      '00000000-0000-4000-8000-000000000003',
      2,
      60
    )
    from generate_series(1, 3)
  $$,
  $$ values (true), (true), (false) $$,
  'profile history rate limiting is enforced per caller'
);

SELECT throws_ok(
  $$
    insert into public.online_matches (
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
      result_payload
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      'completed',
      'synchronous',
      'x01',
      '{"startScore":501,"doubleIn":false,"doubleOut":true}'::jsonb,
      1,
      0,
      now(),
      'checkout',
      '00000000-0000-4000-8000-000000000001',
      jsonb_build_object('padding', repeat('x', 524288))
    )
  $$,
  '23514',
  null,
  'future oversized online match payloads are rejected'
);

SELECT is(
  private.sanitize_online_match_session(
    '{
      "id":"session-1",
      "mode":"x01",
      "config":{"startScore":501,"doubleIn":false,"doubleOut":true,"secret":"no"},
      "players":[{"id":"a","name":"A","kind":"human","email":"hidden@example.test"}],
      "visits":[],
      "status":"completed",
      "startedAt":"2026-01-01T00:00:00.000Z",
      "futureSecret":"hidden"
    }'::jsonb
  ) ? 'futureSecret',
  false,
  'sanitized scorecards drop unknown top-level fields'
);

SELECT ok(
  NOT ((
    private.sanitize_online_match_session(
      '{
        "id":"session-1",
        "mode":"x01",
        "config":{"startScore":501,"doubleIn":false,"doubleOut":true,"secret":"no"},
        "players":[{"id":"a","name":"A","kind":"human","email":"hidden@example.test"}],
        "visits":[],
        "status":"completed",
        "startedAt":"2026-01-01T00:00:00.000Z"
      }'::jsonb
    ) #> '{players,0}'
  ) ? 'email')
  AND NOT ((
    private.sanitize_online_match_session(
      '{
        "id":"session-1",
        "mode":"x01",
        "config":{"startScore":501,"doubleIn":false,"doubleOut":true,"secret":"no"},
        "players":[],
        "visits":[],
        "status":"completed",
        "startedAt":"2026-01-01T00:00:00.000Z"
      }'::jsonb
    ) -> 'config'
  ) ? 'secret'),
  'sanitized scorecards allowlist nested player and config fields'
);

SELECT * FROM finish();
ROLLBACK;
