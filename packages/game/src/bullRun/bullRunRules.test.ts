import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { BullRunOutcome } from '../types/bullRun'
import { bullDart, missDart, numberDart, outerBullDart } from '../testHelpers'
import {
  getBullRunDartPoints,
  getBullRunOutcome,
  getBullRunPickerOutcomes,
  getBullRunVisitScore,
  resolveBullRunVisit,
} from './bullRunRules'

describe('bullRunRules', () => {
  it('scores outer bull as 1 and bullseye as 2', () => {
    expect(getBullRunOutcome(outerBullDart(DartMultiplier.Single))).toBe(BullRunOutcome.Single)
    expect(getBullRunDartPoints(outerBullDart(DartMultiplier.Single))).toBe(1)
    expect(getBullRunOutcome(bullDart())).toBe(BullRunOutcome.Double)
    expect(getBullRunDartPoints(bullDart())).toBe(2)
  })

  it('scores misses and non-bull darts as 0', () => {
    expect(getBullRunOutcome(missDart())).toBe(BullRunOutcome.Miss)
    expect(getBullRunDartPoints(missDart())).toBe(0)
    expect(getBullRunOutcome(numberDart(20, DartMultiplier.Triple))).toBe(BullRunOutcome.Miss)
    expect(getBullRunDartPoints(numberDart(20, DartMultiplier.Triple))).toBe(0)
  })

  it('sums visit points', () => {
    expect(
      getBullRunVisitScore([outerBullDart(DartMultiplier.Single), bullDart(), missDart()]),
    ).toBe(3)
  })

  it('checks out when the visit reaches or passes the target', () => {
    const under = resolveBullRunVisit(10, 6, [outerBullDart(DartMultiplier.Single)], 15)
    expect(under).toMatchObject({
      scoreAfter: 11,
      visitScore: 1,
      checkout: false,
      dartsThrownAfter: 7,
    })

    const exact = resolveBullRunVisit(14, 9, [outerBullDart(DartMultiplier.Single)], 15)
    expect(exact).toMatchObject({ scoreAfter: 15, checkout: true })

    const overshoot = resolveBullRunVisit(14, 9, [bullDart()], 15)
    expect(overshoot).toMatchObject({ scoreAfter: 16, checkout: true })
  })

  it('exposes miss, single, and double picker outcomes', () => {
    expect(getBullRunPickerOutcomes()).toEqual([
      BullRunOutcome.Miss,
      BullRunOutcome.Single,
      BullRunOutcome.Double,
    ])
  })
})
