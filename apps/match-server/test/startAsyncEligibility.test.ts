import { describe, expect, it } from 'vitest'
import { ASYNC_DISCONNECT_MS, ASYNC_VISIT_STALL_MS } from '../src/match/constants'
import {
  canStartAsyncFromInactivity,
  resolveTurnAnchorMs,
} from '../src/match/startAsyncEligibility'

const opponentUserId = '22222222-2222-4222-8222-222222222222'
const viewerUserId = '11111111-1111-4111-8111-111111111111'

describe('resolveTurnAnchorMs', () => {
  it('uses the latest lastVisitAt when any visit exists', () => {
    expect(resolveTurnAnchorMs(1_000, [{ lastVisitAt: 2_000 }, { lastVisitAt: 3_000 }])).toBe(3_000)
  })

  it('falls back to matchStartedAt when nobody has visited', () => {
    expect(resolveTurnAnchorMs(1_000, [{ lastVisitAt: null }, { lastVisitAt: null }])).toBe(1_000)
  })
})

describe('canStartAsyncFromInactivity', () => {
  it('allows start_async after the opponent has been disconnected long enough', () => {
    const nowMs = 100_000

    expect(
      canStartAsyncFromInactivity({
        nowMs,
        matchStartedAt: 0,
        activePlayerId: viewerUserId,
        opponent: {
          userId: opponentUserId,
          connected: false,
          lastSeenAt: nowMs - ASYNC_DISCONNECT_MS,
        },
        players: [{ lastVisitAt: null }, { lastVisitAt: null }],
      }),
    ).toBe(true)
  })

  it('rejects start_async when the opponent just disconnected', () => {
    const nowMs = 100_000

    expect(
      canStartAsyncFromInactivity({
        nowMs,
        matchStartedAt: 0,
        activePlayerId: viewerUserId,
        opponent: {
          userId: opponentUserId,
          connected: false,
          lastSeenAt: nowMs - ASYNC_DISCONNECT_MS + 1,
        },
        players: [{ lastVisitAt: null }, { lastVisitAt: null }],
      }),
    ).toBe(false)
  })

  it('allows start_async when the opponent has stalled on their turn', () => {
    const startedAt = 50_000
    const nowMs = startedAt + ASYNC_VISIT_STALL_MS

    expect(
      canStartAsyncFromInactivity({
        nowMs,
        matchStartedAt: startedAt,
        activePlayerId: opponentUserId,
        opponent: {
          userId: opponentUserId,
          connected: true,
          lastSeenAt: nowMs,
        },
        players: [{ lastVisitAt: null }, { lastVisitAt: null }],
      }),
    ).toBe(true)
  })

  it('rejects visit-stall start_async while it is still the caller turn', () => {
    const startedAt = 50_000
    const nowMs = startedAt + ASYNC_VISIT_STALL_MS

    expect(
      canStartAsyncFromInactivity({
        nowMs,
        matchStartedAt: startedAt,
        activePlayerId: viewerUserId,
        opponent: {
          userId: opponentUserId,
          connected: true,
          lastSeenAt: nowMs,
        },
        players: [{ lastVisitAt: null }, { lastVisitAt: null }],
      }),
    ).toBe(false)
  })

  it('rejects start_async when the opponent is connected and the turn is fresh', () => {
    const nowMs = 100_000

    expect(
      canStartAsyncFromInactivity({
        nowMs,
        matchStartedAt: nowMs - 1_000,
        activePlayerId: opponentUserId,
        opponent: {
          userId: opponentUserId,
          connected: true,
          lastSeenAt: nowMs,
        },
        players: [{ lastVisitAt: nowMs - 1_000 }, { lastVisitAt: null }],
      }),
    ).toBe(false)
  })
})
