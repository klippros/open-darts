import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import { createDartThrow } from '../dartScoring'
import { HunterOutcome } from '../types/hunter'
import { buildHunterThrow } from './buildHunterDarts'

describe('buildHunterDarts', () => {
  it('builds miss, single, double, and triple throws for the aimed field', () => {
    expect(buildHunterThrow(HunterOutcome.Miss, 1)).toMatchObject({
      multiplier: DartMultiplier.Miss,
      points: 0,
    })
    expect(buildHunterThrow(HunterOutcome.Single, 18)).toEqual(
      createDartThrow({ type: DartSegmentType.Number, value: 18 }, DartMultiplier.Single),
    )
    expect(buildHunterThrow(HunterOutcome.Double, 4)).toEqual(
      createDartThrow({ type: DartSegmentType.Number, value: 4 }, DartMultiplier.Double),
    )
    expect(buildHunterThrow(HunterOutcome.Triple, 13)).toEqual(
      createDartThrow({ type: DartSegmentType.Number, value: 13 }, DartMultiplier.Triple),
    )
  })
})
