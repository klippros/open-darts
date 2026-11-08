import { GameModeId } from '@open-darts/game/types/gameMode'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IndexPublishErrorCode,
  publishMatchIndex,
  shouldSkipMatchIndexSync,
} from '../src/match/indexSync'
import type { IndexPublishError } from '../src/match/indexSync'
import { MatchEndingKind, MatchStatus, PlayMode } from '../src/match/types'
import type { PublicMatchState } from '../src/match/types'
import { creatorUserId } from './helpers'

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.href
  }

  return input.url
}

const requestBodyText = (init?: RequestInit): string => {
  if (typeof init?.body === 'string') {
    return init.body
  }

  return '{}'
}

const fakeEnv = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'key',
} as Env

const minimalPublicState = (overrides: Partial<PublicMatchState> = {}): PublicMatchState => ({
  matchId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  inviteToken: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  creatorUserId,
  status: MatchStatus.Waiting,
  playMode: PlayMode.Synchronous,
  mode: GameModeId.X01,
  config: { startScore: 501 },
  legsToWin: 2,
  startingPlayerSlot: 0,
  players: [
    {
      userId: creatorUserId,
      slot: 0,
      connected: false,
      lastSeenAt: null,
      lastVisitAt: null,
    },
  ],
  deadlines: [],
  endingKind: null,
  winnerUserId: null,
  createdAt: 1_700_000_000_000,
  startedAt: null,
  completedAt: null,
  sessionJson: null,
  turnIndex: null,
  activePlayerId: null,
  pendingFinalization: false,
  resultPayloadJson: null,
  cancelProposalUserId: null,
  asyncStartedAt: null,
  dartsOwnerUserId: null,
  asyncStateJson: null,
  version: 1,
  ...overrides,
})

describe('match index sync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips writes against the test supabase url', () => {
    expect(shouldSkipMatchIndexSync('http://example.invalid')).toBe(true)
    expect(shouldSkipMatchIndexSync('')).toBe(true)
    expect(shouldSkipMatchIndexSync('http://127.0.0.1:54321')).toBe(false)
  })

  it('skips publishMatchIndex when supabase url is example.invalid', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await publishMatchIndex(
      { SUPABASE_URL: 'http://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'key' } as Env,
      minimalPublicState(),
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps occupancy conflict to IndexPublishError Conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'occupancy_conflict', code: '23505' }), {
            status: 409,
          }),
      ),
    )

    await expect(publishMatchIndex(fakeEnv, minimalPublicState())).rejects.toMatchObject({
      name: 'IndexPublishError',
      code: IndexPublishErrorCode.Conflict,
    } satisfies Partial<IndexPublishError>)
  })

  it('maps other Rest failures to Unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500 })),
    )

    await expect(publishMatchIndex(fakeEnv, minimalPublicState())).rejects.toMatchObject({
      name: 'IndexPublishError',
      code: IndexPublishErrorCode.Unavailable,
    } satisfies Partial<IndexPublishError>)
  })

  it('posts a single versioned publish RPC including players', async () => {
    const bodies: unknown[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(requestUrl(input)).toBe(
          'http://127.0.0.1:54321/rest/v1/rpc/publish_online_match_index',
        )
        bodies.push(JSON.parse(requestBodyText(init)))
        return new Response(null, { status: 204 })
      }),
    )

    await publishMatchIndex(fakeEnv, minimalPublicState())

    expect(bodies).toEqual([
      expect.objectContaining({
        p_match_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        p_index_version: 1,
        p_players: [{ user_id: creatorUserId, slot: 0 }],
      }),
    ])
  })

  it('publishes cancelled waiting lobbies instead of deleting them', async () => {
    const bodies: unknown[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        bodies.push(JSON.parse(requestBodyText(init)))
        return new Response(null, { status: 204 })
      }),
    )

    await publishMatchIndex(
      fakeEnv,
      minimalPublicState({
        status: MatchStatus.Cancelled,
        endingKind: MatchEndingKind.CreatorCancel,
        version: 3,
      }),
    )

    expect(bodies).toEqual([
      expect.objectContaining({
        p_status: MatchStatus.Cancelled,
        p_ending_kind: MatchEndingKind.CreatorCancel,
        p_index_version: 3,
      }),
    ])
  })

  it('publishes later versions independently so out-of-order retries stay version-gated in the database', async () => {
    const versions: number[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(requestBodyText(init)) as { p_index_version: number }
        versions.push(body.p_index_version)
        return new Response(null, { status: 204 })
      }),
    )

    await publishMatchIndex(fakeEnv, minimalPublicState({ version: 5 }))
    await publishMatchIndex(fakeEnv, minimalPublicState({ version: 4 }))
    await publishMatchIndex(fakeEnv, minimalPublicState({ version: 6 }))

    expect(versions).toEqual([5, 4, 6])
  })
})
