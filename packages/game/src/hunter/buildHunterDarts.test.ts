import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import { HunterOutcome } from '../types/hunter'
import { buildHunterThrow } from './buildHunterDarts'

describe('buildHunterDarts', () => {
  it('builds miss, single, double, and triple throws for the aimed field', () => {
    expect(buildHunterThrow(HunterOutcome.Miss, 1)).toMatchObject({
      multiplier: DartMultiplier.Miss,
      points: 0,
    })
    expect(buildHunterThrow(HunterOutcome.Single, 18)).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 18 },
      multiplier: DartMultiplier.Single,
      points: 18,
    })
    expect(buildHunterThrow(HunterOutcome.Double, 4)).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 4 },
      multiplier: DartMultiplier.Double,
      points: 8,
    })
    expect(buildHunterThrow(HunterOutcome.Triple, 13)).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 13 },
      multiplier: DartMultiplier.Triple,
      points: 39,
    })
  })
})
