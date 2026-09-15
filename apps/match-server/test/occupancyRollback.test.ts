import { env } from 'cloudflare:workers'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { defaultX01Config } from '@open-darts/game/x01/x01Presets'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMatch } from '../src/http/createMatch'
import { joinMatch } from '../src/http/joinMatch'
import { MatchCommandName, MatchStatus } from '../src/match/types'
import { creatorUserId, otherUserId, signAccessToken } from './helpers'

const indexEnv = (): Env =>
  ({
    ...env,
    SUPABASE_URL: 'http://127.0.0.1:54321',
  }) as Env

const create501Request = async (userId: string): Promise<Request> => {
  const token = await signAccessToken(userId)

  return new Request('https://match.example/v1/matches', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: GameModeId.X01,
      config: defaultX01Config(),
      legsToWin: 2,
      startingPlayerSlot: 0,
    }),
  })
}

const trackMatchId = (
  testEnv: Env,
): { createdMatchId: () => string | null; restore: () => void } => {
  let createdMatchId: string | null = null
  const originalGetByName = testEnv.MATCH.getByName.bind(testEnv.MATCH)
  testEnv.MATCH.getByName = ((name: string) => {
    createdMatchId = name
    return originalGetByName(name)
  }) as typeof testEnv.MATCH.getByName

  return {
    createdMatchId: () => createdMatchId,
    restore: () => {
      testEnv.MATCH.getByName = originalGetByName
    },
  }
}

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.href
  }

  return input.url
}

const mockIndexFetch = (occupancyPostStatus: number): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input)
      const method = init?.method ?? 'GET'

      if (url.includes('online_match_occupancy') && method === 'POST') {
        return new Response(JSON.stringify({ message: 'occupied' }), {
          status: occupancyPostStatus,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(null, { status: 204 })
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HTTP occupancy conflict rollback', () => {
  it('create returns 409 and cancels the waiting DO when occupancy conflicts', async () => {
    mockIndexFetch(409)
    const testEnv = indexEnv()
    const tracker = trackMatchId(testEnv)

    const response = await createMatch(await create501Request(creatorUserId), testEnv)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: 'conflict' })

    const matchId = tracker.createdMatchId()
    expect(matchId).not.toBeNull()
    tracker.restore()

    const stub = testEnv.MATCH.getByName(matchId!)
    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Cancelled)
  })

  it('create returns 503 and cancels the waiting DO when index is unavailable', async () => {
    mockIndexFetch(500)
    const testEnv = indexEnv()
    const tracker = trackMatchId(testEnv)

    const response = await createMatch(await create501Request(creatorUserId), testEnv)
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: 'index_unavailable' })

    const matchId = tracker.createdMatchId()
    expect(matchId).not.toBeNull()
    tracker.restore()

    const stub = testEnv.MATCH.getByName(matchId!)
    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Cancelled)
  })

  it('join returns 409 and removes the joiner when occupancy conflicts', async () => {
    const created = await createMatch(await create501Request(creatorUserId), env)
    expect(created.status).toBe(201)
    const createdBody = await created.json<{ matchId: string; inviteToken: string }>()

    mockIndexFetch(409)
    const guestToken = await signAccessToken(otherUserId)
    const joinResponse = await joinMatch(
      new Request(`https://match.example/v1/matches/${createdBody.matchId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${guestToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteToken: createdBody.inviteToken }),
      }),
      indexEnv(),
      createdBody.matchId,
    )

    expect(joinResponse.status).toBe(409)
    expect(await joinResponse.json()).toMatchObject({ error: 'conflict' })

    const stub = env.MATCH.getByName(createdBody.matchId)
    const state = await stub.applyCommand(creatorUserId, { name: MatchCommandName.GetState })
    expect(state.state?.status).toBe(MatchStatus.Waiting)
    expect(state.state?.players).toHaveLength(1)
    expect(state.state?.players[0]?.userId).toBe(creatorUserId)
  })
})
