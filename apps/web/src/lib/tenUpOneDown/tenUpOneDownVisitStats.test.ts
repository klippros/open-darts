import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import type { Visit } from '../../types/visit'
import { numberDart } from '../testHelpers'
import {
  computeTenUpOneDownSingleSessionStats,
  isTenUpOneDownWinSession,
} from './tenUpOneDownVisitStats'

const visit = (overrides: Partial<Visit>): Visit => ({
  visitIndex: 0,
  playerId: 'p1',
  darts: [numberDart(20, DartMultiplier.Double)],
  visitScore: 40,
  scoreBefore: 60,
  scoreAfter: 70,
  bust: false,
  checkout: false,
  ...overrides,
})

const session = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.TenUpOneDown,
  config: {
    startScore: 60,
    incrementUp: 10,
    decrementDown: 1,
    minScore: 2,
    doubleOut: true,
  },
  players: [{ id: 'p1', name: 'You', kind: PlayerKind.Human }],
  visits: [],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-01T10:30:00.000Z',
  ...overrides,
})

describe('tenUpOneDownVisitStats', () => {
  it('computes single-session checkout stats', () => {
    expect(
      computeTenUpOneDownSingleSessionStats(
        session({
          visits: [
            visit({ checkout: true, scoreBefore: 60, scoreAfter: 70, visitScore: 60 }),
            visit({
              visitIndex: 1,
              checkout: false,
              bust: true,
              scoreBefore: 70,
              scoreAfter: 69,
              visitScore: 0,
            }),
            visit({
              visitIndex: 2,
              checkout: true,
              scoreBefore: 100,
              scoreAfter: 110,
              visitScore: 100,
            }),
          ],
        }),
      ),
    ).toEqual({
      checkouts: 2,
      visitCount: 3,
      checkoutRate: (2 / 3) * 100,
      highestCheckout: 100,
    })
  })

  it('detects a win session after checking out 170', () => {
    expect(
      isTenUpOneDownWinSession(
        session({
          visits: [
            visit({
              checkout: true,
              scoreBefore: 170,
              scoreAfter: 170,
              visitScore: 170,
            }),
          ],
        }),
      ),
    ).toBe(true)
  })

  it('does not treat early finishes as wins', () => {
    expect(
      isTenUpOneDownWinSession(
        session({
          finishedEarly: true,
          visits: [
            visit({
              checkout: true,
              scoreBefore: 170,
              scoreAfter: 170,
              visitScore: 170,
            }),
          ],
        }),
      ),
    ).toBe(false)
  })
})
