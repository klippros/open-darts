import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'
import { computeX01Stats, FIVE_OH_ONE_START_SCORE } from './x01Stats'

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
  visits: [sampleVisit()],
  status: GameStatus.Completed,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-10T10:00:00.000Z',
  ...overrides,
})

describe('x01Stats', () => {
  it('calculates scoring average until 170 separately from full leg average', () => {
    const stats = computeX01Stats([
      sampleSession({
        visits: [
          sampleVisit({
            visitScore: 100,
            scoreBefore: 501,
            scoreAfter: 401,
            darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
          }),
          sampleVisit({
            visitIndex: 1,
            visitScore: 80,
            scoreBefore: 401,
            scoreAfter: 321,
            darts: [numberDart(20, DartMultiplier.Triple)],
          }),
          sampleVisit({
            visitIndex: 2,
            visitScore: 50,
            scoreBefore: 160,
            scoreAfter: 110,
            darts: [numberDart(20, DartMultiplier.Triple)],
          }),
          sampleVisit({
            visitIndex: 3,
            visitScore: 110,
            scoreBefore: 110,
            scoreAfter: 0,
            checkout: true,
            darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
          }),
        ],
      }),
    ])

    expect(stats.fiveOhOne.threeDartAverage).toBe(85)
    expect(stats.fiveOhOne.threeDartAverageUntil170).toBe(90)
    expect(stats.fiveOhOne.bestGameAverage).toBe(85)
    expect(stats.fiveOhOne.checkoutRate).toBe(100)
    expect(stats.other.gameCount).toBe(0)
  })

  it('keeps 501 and other x01 stats separate', () => {
    const stats = computeX01Stats([
      sampleSession({
        config: { startScore: FIVE_OH_ONE_START_SCORE, doubleIn: false, doubleOut: true },
        visits: [
          sampleVisit({ visitScore: 100, scoreBefore: 501, scoreAfter: 401 }),
          sampleVisit({
            visitIndex: 1,
            checkout: true,
            scoreAfter: 0,
            scoreBefore: 50,
            visitScore: 50,
            darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
          }),
        ],
      }),
      sampleSession({
        id: '301',
        config: { startScore: 301, doubleIn: false, doubleOut: true },
        visits: [
          sampleVisit({ visitScore: 20, scoreBefore: 301, scoreAfter: 281 }),
          sampleVisit({
            visitIndex: 1,
            checkout: true,
            scoreAfter: 0,
            scoreBefore: 40,
            visitScore: 40,
            darts: [numberDart(20, DartMultiplier.Double)],
          }),
        ],
      }),
    ])

    expect(stats.fiveOhOne.gameCount).toBe(1)
    expect(stats.fiveOhOne.threeDartAverage).toBe(75)
    expect(stats.fiveOhOne.bestGameAverage).toBe(75)
    expect(stats.fiveOhOne.avgDarts).toBe(3)

    expect(stats.other.gameCount).toBe(1)
    expect(stats.other.threeDartAverage).toBe(30)
    expect(stats.other.bestGameAverage).toBe(30)
    expect(stats.other.avgDarts).toBe(2)
  })

  it('tracks the best single-game 3-dart average', () => {
    const stats = computeX01Stats([
      sampleSession({
        id: 'hot-leg',
        visits: [
          sampleVisit({ visitScore: 100, scoreBefore: 501, scoreAfter: 401 }),
          sampleVisit({ visitIndex: 1, visitScore: 100, scoreBefore: 401, scoreAfter: 301 }),
          sampleVisit({
            visitIndex: 2,
            checkout: true,
            visitScore: 100,
            scoreBefore: 100,
            scoreAfter: 0,
          }),
        ],
      }),
      sampleSession({
        id: 'cold-leg',
        visits: [
          sampleVisit({ visitScore: 40, scoreBefore: 501, scoreAfter: 461 }),
          sampleVisit({
            visitIndex: 1,
            checkout: true,
            visitScore: 40,
            scoreBefore: 40,
            scoreAfter: 0,
          }),
        ],
      }),
    ])

    expect(stats.fiveOhOne.threeDartAverage).toBe(76)
    expect(stats.fiveOhOne.bestGameAverage).toBe(100)
  })

  it('averages darts for checked-out legs within each x01 group', () => {
    const stats = computeX01Stats([
      sampleSession({
        config: { startScore: FIVE_OH_ONE_START_SCORE, doubleIn: false, doubleOut: true },
        visits: [
          sampleVisit({
            darts: [
              numberDart(20, DartMultiplier.Triple),
              numberDart(20, DartMultiplier.Triple),
              numberDart(20, DartMultiplier.Triple),
            ],
          }),
          sampleVisit({
            visitIndex: 1,
            checkout: true,
            scoreAfter: 0,
            scoreBefore: 50,
            visitScore: 50,
            darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
          }),
        ],
      }),
      sampleSession({
        id: 'early-finish',
        finishedEarly: true,
        visits: [sampleVisit()],
      }),
    ])

    expect(stats.fiveOhOne.avgDarts).toBe(5)
    expect(stats.fiveOhOne.checkoutDartCount).toBe(1)
    expect(stats.fiveOhOne.checkoutRate).toBe(50)
  })
})
