import { describe, expect, it } from 'vitest'
import { createGameController } from '@open-darts/game/game/createSession'
import { buildBullRunThrow } from '@open-darts/game/bullRun/buildBullRunDarts'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { BullRunOutcome } from '@open-darts/game/types/bullRun'
import { PlayerKind } from '@open-darts/game/types/player'
import {
  computeBullRunSingleSessionStats,
  getBullRunLiveScoreMetrics,
  getBullRunLiveStats,
  ratePerThreeDarts,
} from './bullRunVisitStats'

const player = { id: 'p1', name: 'Player', kind: PlayerKind.Human }

describe('bullRunVisitStats', () => {
  it('normalizes rates to three darts', () => {
    expect(ratePerThreeDarts(1, 1)).toBe(3)
    expect(ratePerThreeDarts(3, 3)).toBe(3)
    expect(ratePerThreeDarts(0, 0)).toBeNull()
  })

  it('computes live score metrics including pending darts', () => {
    const controller = createGameController({
      mode: GameModeId.BullRun,
      players: [player],
      config: { targetScore: 15 },
    }).recordDarts([
      buildBullRunThrow(BullRunOutcome.Single),
      buildBullRunThrow(BullRunOutcome.Double),
      buildBullRunThrow(BullRunOutcome.Miss),
    ])

    const stats = getBullRunLiveStats(controller.session.visits, player.id, [
      buildBullRunThrow(BullRunOutcome.Single),
    ])

    expect(stats).toMatchObject({
      score: 4,
      dartsThrown: 4,
      counts: { singles: 2, doubles: 1, misses: 1 },
    })
    expect(stats.hitRate).toBeCloseTo(75)
    expect(stats.avgPerThreeDarts).toBe(3)
    expect(stats.singlesPerThreeDarts).toBeCloseTo(1.5)
    expect(stats.doublesPerThreeDarts).toBeCloseTo(0.75)
    expect(getBullRunLiveScoreMetrics(stats)).toEqual([
      { label: 'Singles', value: '1.50' },
      { label: 'Doubles', value: '0.75' },
      { label: 'Hit %', value: '75' },
      { label: 'Avg', value: '3.00' },
    ])
  })

  it('computes session stats for the primary player', () => {
    const controller = createGameController({
      mode: GameModeId.BullRun,
      players: [player],
      config: { targetScore: 5 },
    }).recordDarts([
      buildBullRunThrow(BullRunOutcome.Double),
      buildBullRunThrow(BullRunOutcome.Double),
      buildBullRunThrow(BullRunOutcome.Single),
    ])

    const stats = computeBullRunSingleSessionStats(controller.session)

    expect(stats).toMatchObject({
      score: 5,
      targetScore: 5,
      counts: { singles: 1, doubles: 2, misses: 0 },
      dartsThrown: 3,
    })
    expect(stats?.hitRate).toBe(100)
    expect(stats?.avgPerThreeDarts).toBe(5)
    expect(stats?.singlesPerThreeDarts).toBe(1)
    expect(stats?.doublesPerThreeDarts).toBe(2)
  })
})
