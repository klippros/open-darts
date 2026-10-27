import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import { HunterOutcome } from '@open-darts/game/types/hunter'
import { buildHunterThrowsForOutcomes } from './buildHunterThrowsForOutcomes'

describe('buildHunterThrowsForOutcomes', () => {
  it('aims each dart at the field after earlier advances in the visit', () => {
    const darts = buildHunterThrowsForOutcomes(
      [HunterOutcome.Single, HunterOutcome.Double, HunterOutcome.Miss],
      1,
    )

    expect(darts).toHaveLength(3)
    expect(darts[0]).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 1 },
      multiplier: DartMultiplier.Single,
    })
    // Single on 1 advances to 18; Double aims at 18
    expect(darts[1]).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 18 },
      multiplier: DartMultiplier.Double,
    })
    // Double advances two steps from 18 → 4; Miss is a generic miss throw
    expect(darts[2]).toMatchObject({ multiplier: DartMultiplier.Miss })
  })

  it('keeps the same aim field across consecutive misses', () => {
    const darts = buildHunterThrowsForOutcomes(
      [HunterOutcome.Miss, HunterOutcome.Miss, HunterOutcome.Triple],
      20,
    )

    expect(darts[0]).toMatchObject({ multiplier: DartMultiplier.Miss })
    expect(darts[1]).toMatchObject({ multiplier: DartMultiplier.Miss })
    expect(darts[2]).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 20 },
      multiplier: DartMultiplier.Triple,
    })
  })
})
