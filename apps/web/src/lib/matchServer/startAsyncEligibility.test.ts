import { describe, expect, it } from 'vitest'
import {
  ASYNC_DISCONNECT_MS,
  ASYNC_VISIT_STALL_MS,
  canStartAsyncFromInactivity,
  resolveTurnAnchorMs,
} from './startAsyncEligibility'

const opponentUserId = '22222222-2222-4222-8222-222222222222'
const viewerUserId = '11111111-1111-4111-8111-111111111111'

describe('startAsyncEligibility', () => {
  it('uses the latest lastVisitAt as the turn anchor', () => {
    expect(resolveTurnAnchorMs(1_000, [{ lastVisitAt: 2_000 }, { lastVisitAt: 3_000 }])).toBe(3_000)
  })

  it('allows async after a long enough opponent disconnect', () => {
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

  it('allows async when the opponent has stalled on their turn', () => {
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

  it('rejects async while the opponent is connected and the turn is fresh', () => {
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
