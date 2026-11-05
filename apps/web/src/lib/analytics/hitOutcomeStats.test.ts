import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '@open-darts/game/types/dart'
import { VisitInputMode } from '@open-darts/game/types/visit'
import { missDart, outerBullDart } from '@open-darts/game/testHelpers'
import {
  collectPlayerDarts,
  emptyBaseHitCounts,
  emptyHitCounts,
  formatThreeDartRate,
  getHitCount,
  getHitRateFromCounts,
  mergeBaseHitOutcomeCounts,
  mergeHitOutcomeCounts,
  ratePerThreeDarts,
} from './hitOutcomeStats'

describe('hitOutcomeStats', () => {
  it('merges base and full hit counts', () => {
    expect(
      mergeBaseHitOutcomeCounts(
        { singles: 1, doubles: 2, misses: 3 },
        { singles: 4, doubles: 5, misses: 6 },
      ),
    ).toEqual({ singles: 5, doubles: 7, misses: 9 })
    expect(
      mergeHitOutcomeCounts(emptyHitCounts(), { singles: 1, doubles: 0, trebles: 2, misses: 1 }),
    ).toEqual({ singles: 1, doubles: 0, trebles: 2, misses: 1 })
  })

  it('computes hit rate including optional trebles', () => {
    expect(getHitCount(emptyBaseHitCounts())).toBe(0)
    expect(getHitRateFromCounts({ singles: 1, doubles: 1, misses: 2 })).toBe(50)
    expect(getHitRateFromCounts({ singles: 1, doubles: 0, trebles: 1, misses: 0 })).toBe(100)
    expect(getHitRateFromCounts(emptyHitCounts())).toBeNull()
  })

  it('normalizes three-dart rates', () => {
    expect(ratePerThreeDarts(1, 1)).toBe(3)
    expect(ratePerThreeDarts(3, 3)).toBe(3)
    expect(ratePerThreeDarts(0, 0)).toBeNull()
    expect(formatThreeDartRate(1.5)).toBe('1.50')
    expect(formatThreeDartRate(null)).toBe('—')
  })

  it('collects committed and pending darts for a player', () => {
    const outerBull = outerBullDart(DartMultiplier.Single)
    const miss = missDart()
    const darts = collectPlayerDarts(
      [
        {
          visitIndex: 0,
          playerId: 'p1',
          inputMode: VisitInputMode.PerDart,
          darts: [outerBull],
          visitScore: 1,
          scoreBefore: 0,
          scoreAfter: 1,
          bust: false,
          checkout: false,
        },
        {
          visitIndex: 1,
          playerId: 'p2',
          inputMode: VisitInputMode.PerDart,
          darts: [miss],
          visitScore: 0,
          scoreBefore: 0,
          scoreAfter: 0,
          bust: false,
          checkout: false,
        },
      ],
      'p1',
      [miss],
    )

    expect(darts).toEqual([outerBull, miss])
  })
})
