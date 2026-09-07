import { describe, expect, it } from 'vitest'
import { GameModeId, GameStatus } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { PlayerKind } from '../../types/player'
import { DartMultiplier } from '../../types/dart'
import { VisitInputMode } from '../../types/visit'
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
    expect(stats.fiveOhOne.bestLegAverage).toBe(85)
    expect(stats.fiveOhOne.checkoutLegCount).toBe(1)
    expect(stats.threeOhOne.legCount).toBe(0)
    expect(stats.fourOhOne.legCount).toBe(0)
    expect(stats.all.legCount).toBe(1)
  })

  it('keeps 501, 401, and 301 x01 stats separate', () => {
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

    expect(stats.fiveOhOne.legCount).toBe(1)
    expect(stats.fiveOhOne.threeDartAverage).toBe(75)
    expect(stats.fiveOhOne.bestLegAverage).toBe(75)
    expect(stats.fiveOhOne.avgDarts).toBe(3)
    expect(stats.fiveOhOne.lastPlayedAt).toBe('2026-01-01T10:00:00.000Z')

    expect(stats.threeOhOne.legCount).toBe(1)
    expect(stats.threeOhOne.threeDartAverage).toBe(30)
    expect(stats.threeOhOne.bestLegAverage).toBe(30)
    expect(stats.threeOhOne.avgDarts).toBe(2)
    expect(stats.threeOhOne.lastPlayedAt).toBe('2026-01-01T10:00:00.000Z')

    expect(stats.fourOhOne.legCount).toBe(0)
    expect(stats.all.legCount).toBe(2)
  })

  it('tracks the best single-leg 3-dart average', () => {
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
    expect(stats.fiveOhOne.bestLegAverage).toBe(100)
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
    expect(stats.fiveOhOne.checkoutLegCount).toBe(1)
    expect(stats.fiveOhOne.legCount).toBe(2)
  })

  it('aggregates multi-leg matches as individual legs', () => {
    const stats = computeX01Stats([
      sampleSession({
        id: 'best-of-three',
        visits: [
          sampleVisit({
            visitScore: 100,
            scoreBefore: 501,
            scoreAfter: 401,
            legIndex: 1,
            darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
          }),
          sampleVisit({
            visitIndex: 1,
            visitScore: 100,
            scoreBefore: 401,
            scoreAfter: 301,
            legIndex: 1,
          }),
          sampleVisit({
            visitIndex: 2,
            checkout: true,
            visitScore: 100,
            scoreBefore: 100,
            scoreAfter: 0,
            legIndex: 1,
            darts: [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple)],
          }),
          sampleVisit({
            visitIndex: 3,
            visitScore: 40,
            scoreBefore: 501,
            scoreAfter: 461,
            legIndex: 2,
            darts: [numberDart(20, DartMultiplier.Single), numberDart(20, DartMultiplier.Single)],
          }),
          sampleVisit({
            visitIndex: 4,
            checkout: true,
            visitScore: 40,
            scoreBefore: 40,
            scoreAfter: 0,
            legIndex: 2,
            darts: [numberDart(20, DartMultiplier.Double)],
          }),
        ],
      }),
    ])

    // Visit-weighted: (100+100+100+40+40) / 5 = 76
    expect(stats.fiveOhOne.threeDartAverage).toBe(76)
    expect(stats.fiveOhOne.legCount).toBe(2)
    expect(stats.fiveOhOne.checkoutLegCount).toBe(2)
    // Hot leg average is 100, not the blended match average of 76
    expect(stats.fiveOhOne.bestLegAverage).toBe(100)
    // Leg 1: 2+1+2 = 5 darts; leg 2: 2+1 = 3 darts → avg 4
    expect(stats.fiveOhOne.avgDarts).toBe(4)
  })

  it('excludes visit-score legs from double checkout but keeps averages and dart counts', () => {
    const stats = computeX01Stats([
      sampleSession({
        visits: [
          sampleVisit({
            visitScore: 100,
            scoreBefore: 501,
            scoreAfter: 401,
            darts: [],
            inputMode: VisitInputMode.VisitScore,
          }),
          sampleVisit({
            visitIndex: 1,
            visitScore: 401,
            scoreBefore: 401,
            scoreAfter: 0,
            checkout: true,
            darts: [],
            inputMode: VisitInputMode.VisitScore,
          }),
        ],
      }),
    ])

    expect(stats.fiveOhOne.threeDartAverage).toBe(250.5)
    expect(stats.fiveOhOne.avgDarts).toBe(6)
    expect(stats.fiveOhOne.doubleCheckout).toEqual({ attempts: 0, successes: 0 })
    expect(stats.fiveOhOne.checkoutLegCount).toBe(1)
  })
})
