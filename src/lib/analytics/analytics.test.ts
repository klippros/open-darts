import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'
import { computeAnalytics } from './computeAnalytics'
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
  darts: [numberDart(20, DartMultiplier.Triple)],
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

describe('analytics helpers', () => {
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

  it('filters by date range', () => {
    const recent = sampleSession({
      id: 'recent',
      completedAt: new Date().toISOString(),
    })
    const older = sampleSession({
      id: 'older',
      completedAt: '2020-01-01T10:00:00.000Z',
    })

    expect(filterSessions([recent, older], { dateRange: '7d' })).toEqual([recent])
  })
})

describe('computeAnalytics', () => {
  it('returns x01 and practice sections for filtered sessions', () => {
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
      { dateRange: 'all' },
    )

    expect(result.x01.fiveOhOne.gameCount).toBe(1)
    expect(result.x01.other.gameCount).toBe(0)
    expect(result.practice.checkout).toHaveLength(1)
    expect(result.practice.other).toHaveLength(0)
  })
})
