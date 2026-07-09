import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { computeAnalytics, computeAnalyticsSnapshot } from './computeAnalytics'
import { filterSessions } from './sessionFilters'
import {
  getPrimaryPlayerVisits,
  getThreeDartAverage,
  sessionFinishedWithCheckout,
} from './visitStats'

const sampleVisit = (
  overrides: Partial<GameSession['visits'][number]> = {},
): GameSession['visits'][number] => ({
  visitIndex: 0,
  playerId: 'player-1',
  darts: [],
  visitScore: 60,
  scoreBefore: 501,
  scoreAfter: 441,
  bust: false,
  checkout: false,
  ...overrides,
})

const sampleSession = (overrides: Partial<GameSession> = {}): GameSession => ({
  id: 'session-1',
  mode: GameModeId.X01,
  config: { startScore: 501, doubleIn: false, doubleOut: true },
  players: [{ id: 'player-1', name: 'You', kind: PlayerKind.Human }],
  visits: [
    sampleVisit(),
    sampleVisit({ visitIndex: 1, visitScore: 40, scoreBefore: 441, scoreAfter: 401 }),
  ],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-10T10:00:00.000Z',
  ...overrides,
})

describe('visitStats', () => {
  it('calculates 3-dart averages from primary player visits', () => {
    expect(getThreeDartAverage(getPrimaryPlayerVisits(sampleSession()))).toBe(50)
  })

  it('detects checkout finishes', () => {
    expect(
      sessionFinishedWithCheckout(
        sampleSession({
          visits: [sampleVisit({ checkout: true, scoreAfter: 0, visitScore: 501 })],
        }),
      ),
    ).toBe(true)
  })
})

describe('sessionFilters', () => {
  it('filters by mode and date range', () => {
    const recent = sampleSession({
      id: 'recent',
      completedAt: new Date().toISOString(),
    })
    const older = sampleSession({
      id: '121',
      mode: GameModeId.OneTwentyOne,
      config: { startScore: 121, increment: 20, doubleOut: true },
      completedAt: '2020-01-01T10:00:00.000Z',
    })

    expect(
      filterSessions([recent, older], { mode: GameModeId.OneTwentyOne, dateRange: 'all' }),
    ).toEqual([older])

    expect(filterSessions([recent, older], { mode: 'all', dateRange: '7d' })).toEqual([recent])
  })
})

describe('computeAnalytics', () => {
  it('summarizes visit averages and checkout rate for x01 games', () => {
    const snapshot = computeAnalyticsSnapshot([
      sampleSession({
        visits: [
          sampleVisit({ visitScore: 100, scoreBefore: 501, scoreAfter: 401 }),
          sampleVisit({
            visitIndex: 1,
            visitScore: 50,
            scoreBefore: 50,
            scoreAfter: 0,
            checkout: true,
          }),
        ],
      }),
    ])

    expect(snapshot).toMatchObject({
      gameCount: 1,
      visitCount: 2,
      threeDartAverage: 75,
      checkoutRate: 100,
      avgVisitsPerGame: 2,
    })
  })

  it('computes checkout rate from practice visits', () => {
    const snapshot = computeAnalyticsSnapshot([
      sampleSession({
        mode: GameModeId.OneTwentyOne,
        config: { startScore: 121, increment: 20, doubleOut: true },
        visits: [
          sampleVisit({ checkout: true, scoreAfter: 141, visitScore: 121 }),
          sampleVisit({
            visitIndex: 1,
            checkout: false,
            scoreAfter: 121,
            visitScore: 0,
            bust: true,
          }),
        ],
      }),
    ])

    expect(snapshot.checkoutRate).toBe(50)
  })

  it('returns per-mode breakdowns for filtered sessions', () => {
    const result = computeAnalytics(
      [
        sampleSession({ id: 'x01' }),
        sampleSession({
          id: '121',
          mode: GameModeId.OneTwentyOne,
          config: { startScore: 121, increment: 20, doubleOut: true },
          visits: [sampleVisit({ checkout: true, scoreAfter: 141, visitScore: 121 })],
        }),
      ],
      { mode: 'all', dateRange: 'all' },
    )

    expect(result.overview.gameCount).toBe(2)
    expect(result.byMode).toHaveLength(2)
    expect(result.byMode.map((row) => row.mode)).toEqual([GameModeId.OneTwentyOne, GameModeId.X01])
  })
})
