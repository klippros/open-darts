import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import { BullRunOutcome } from '../types/bullRun'
import { buildBullRunThrow } from './buildBullRunDarts'

describe('buildBullRunThrow', () => {
  it('builds miss, outer bull, and bullseye throws', () => {
    expect(buildBullRunThrow(BullRunOutcome.Miss)).toMatchObject({
      multiplier: DartMultiplier.Miss,
    })
    expect(buildBullRunThrow(BullRunOutcome.Single)).toMatchObject({
      segment: { type: DartSegmentType.OuterBull },
      multiplier: DartMultiplier.Single,
      points: 25,
    })
    expect(buildBullRunThrow(BullRunOutcome.Double)).toMatchObject({
      segment: { type: DartSegmentType.Bull },
      multiplier: DartMultiplier.Single,
      points: 50,
    })
  })
})
