import {
  MAX_SESSION_BYTES,
  addStoredValueToBudget,
  parseProfileStatsRequest,
  parseStoredSession,
  storedValueByteLength,
} from './profileStatsGuards.ts'

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message)
  }
}

const session = {
  id: 'session-1',
  mode: 'x01',
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'user-a', name: 'A', kind: 'human' }],
  visits: [],
  status: 'completed',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:15:00.000Z',
}

Deno.test('profile stats request accepts exactly one UUID', () => {
  const userId = '00000000-0000-4000-8000-000000000001'
  assert(parseProfileStatsRequest({ userId }) === userId, 'valid UUID should pass')
  assert(parseProfileStatsRequest({ userId, extra: true }) === null, 'extra keys should fail')
  assert(parseProfileStatsRequest({ userId: 'not-a-uuid' }) === null, 'invalid UUID should fail')
  assert(parseProfileStatsRequest(null) === null, 'non-object body should fail')
})

Deno.test('stored sessions reject malformed and oversized values', () => {
  assert(parseStoredSession(session) !== null, 'valid session should parse')
  assert(parseStoredSession({ ...session, id: 42 }) === null, 'malformed session should fail')
  assert(
    parseStoredSession({ ...session, padding: 'x'.repeat(MAX_SESSION_BYTES) }) === null,
    'oversized session should fail',
  )
})

Deno.test('payload budgets count UTF-8 bytes and reject overflow', () => {
  assert(storedValueByteLength('é') === 2, 'UTF-8 byte length should be used')
  const first = addStoredValueToBudget(0, session, MAX_SESSION_BYTES)
  assert(first !== null && first > 0, 'valid session should consume budget')
  assert(
    addStoredValueToBudget(MAX_SESSION_BYTES, session, MAX_SESSION_BYTES) === null,
    'total budget overflow should fail',
  )
})

Deno.test('501 reads stay window-bounded and errors stay generic', async () => {
  const source = await Deno.readTextFile(new URL('./index.ts', import.meta.url))
  assert(
    source.includes(".select('completed_at, result_payload, online_match_players!inner(user_id)')"),
    '501 query should join membership directly',
  )
  assert(
    source.includes(".gte('completed_at', windowStart)"),
    '501 query should have a lower bound',
  )
  assert(
    source.includes(".lte('completed_at', latestOnlineAt)"),
    '501 query should have an upper bound',
  )
  assert(!source.includes(".in('id', matchIds)"), '501 query must not fetch an unbounded id list')
  assert(!source.includes('error.message'), 'database errors must not be reflected')
})
