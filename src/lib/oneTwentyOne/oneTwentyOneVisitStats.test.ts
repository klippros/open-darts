import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import type { Visit } from '../../types/visit'
import { numberDart } from '../testHelpers'
import {
  computeOneTwentyOneSingleSessionStats,
  getHighestOneTwentyOneCheckoutTarget,
  getSessionCheckoutCount,
} from './oneTwentyOneVisitStats'

const visit = (overrides: Partial<Visit>): Visit => ({
  visitIndex: 0,
  playerId: 'p1',
  darts: [numberDart(20, DartMultiplier.Double)],
  visitScore: 40,
  scoreBefore: 121,
  scoreAfter: 81,
  bust: false,
  checkout: false,
  ...overrides,
})

const session = (visits: Visit[]): GameSession => ({
  id: 'session-1',
  mode: GameModeId.OneTwentyOne,
  config: {
    startScore: 121,
    increment: 1,
    startingLives: 3,
    maxVisitsPerTarget: 3,
    doubleOut: true,
  },
  players: [{ id: 'p1', name: 'You', kind: PlayerKind.Human }],
  visits,
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-01T10:30:00.000Z',
})

describe('oneTwentyOneVisitStats', () => {
  it('counts successful checkouts in a session', () => {
    expect(
      getSessionCheckoutCount(
        session([
          visit({ checkout: true, scoreBefore: 121, scoreAfter: 122, visitScore: 121 }),
          visit({
            visitIndex: 1,
            checkout: false,
            bust: true,
            scoreBefore: 122,
            scoreAfter: 122,
            visitScore: 0,
          }),
          visit({
            visitIndex: 2,
            checkout: true,
            scoreBefore: 122,
            scoreAfter: 123,
            visitScore: 122,
          }),
        ]),
      ),
    ).toBe(2)
  })

  it('uses the round target for highest checkout, not remaining score', () => {
    expect(
      getHighestOneTwentyOneCheckoutTarget([
        visit({
          checkout: true,
          scoreBefore: 40,
          scoreAfter: 141,
          visitScore: 40,
          metadata: { roundTarget: 140 },
        }),
        visit({
          visitIndex: 1,
          checkout: true,
          scoreBefore: 121,
          scoreAfter: 122,
          visitScore: 121,
          metadata: { roundTarget: 121 },
        }),
      ]),
    ).toBe(140)
  })

  it('computes single-session summary stats', () => {
    expect(
      computeOneTwentyOneSingleSessionStats(
        session([
          visit({
            checkout: true,
            scoreBefore: 121,
            scoreAfter: 122,
            visitScore: 121,
            metadata: { peakTargetAfter: 122 },
          }),
          visit({
            visitIndex: 1,
            checkout: true,
            scoreBefore: 140,
            scoreAfter: 141,
            visitScore: 140,
            metadata: { peakTargetAfter: 141 },
          }),
        ]),
      ),
    ).toEqual({
      checkouts: 2,
      visitCount: 2,
      threeDartAverage: 130.5,
      peakTarget: 141,
    })
  })

  it('returns null for non-121 sessions', () => {
    expect(
      computeOneTwentyOneSingleSessionStats({
        ...session([]),
        mode: GameModeId.Bob27,
        config: { startScore: 27 },
      }),
    ).toBeNull()
  })
})
