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

  it('maps occupancy POST 409 to IndexPublishError Conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = requestUrl(input)
        if (url.includes('online_match_occupancy') && init?.method === 'POST') {
          return new Response(JSON.stringify({ message: 'duplicate' }), { status: 409 })
        }
        return new Response(null, { status: 204 })
      }),
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

  it('happy path posts matches, players, and occupancy', async () => {
    const calls: { url: string; method: string }[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: requestUrl(input), method: init?.method ?? 'GET' })
        return new Response(null, { status: 204 })
      }),
    )

    await publishMatchIndex(fakeEnv, minimalPublicState())

    expect(calls).toEqual([
      { url: 'http://127.0.0.1:54321/rest/v1/online_matches', method: 'POST' },
      {
        url: `http://127.0.0.1:54321/rest/v1/online_match_players?match_id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&user_id=not.in.(${creatorUserId})`,
        method: 'DELETE',
      },
      {
        url: 'http://127.0.0.1:54321/rest/v1/online_match_players?on_conflict=match_id,user_id',
        method: 'POST',
      },
      {
        url: 'http://127.0.0.1:54321/rest/v1/online_match_occupancy?match_id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        method: 'DELETE',
      },
      { url: 'http://127.0.0.1:54321/rest/v1/online_match_occupancy', method: 'POST' },
    ])
  })

  it('waiting cancel endings DELETE online_matches', async () => {
    const calls: { url: string; method: string }[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: requestUrl(input), method: init?.method ?? 'GET' })
        return new Response(null, { status: 204 })
      }),
    )

    await publishMatchIndex(
      fakeEnv,
      minimalPublicState({
        status: MatchStatus.Cancelled,
        endingKind: MatchEndingKind.CreatorCancel,
      }),
    )

    expect(calls).toEqual([
      {
        url: 'http://127.0.0.1:54321/rest/v1/online_matches?id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        method: 'DELETE',
      },
    ])
  })
})
