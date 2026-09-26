import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import {
  buildClaimTheBoardDartsForHitCount,
  createClaimTheBoardHitDart,
} from './buildClaimTheBoardDarts'

describe('buildClaimTheBoardDarts', () => {
  it('builds hit darts that match the aim mode', () => {
    expect(createClaimTheBoardHitDart(0, AroundTheClockAimMode.Doubles)).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 1 },
      multiplier: DartMultiplier.Double,
    })
    expect(createClaimTheBoardHitDart(0, AroundTheClockAimMode.Trebles)).toMatchObject({
      segment: { type: DartSegmentType.Number, value: 1 },
      multiplier: DartMultiplier.Triple,
    })
    expect(createClaimTheBoardHitDart(20, AroundTheClockAimMode.Any)).toMatchObject({
      segment: { type: DartSegmentType.OuterBull },
      multiplier: DartMultiplier.Single,
    })
  })

  it('pads hit counts to three darts with misses', () => {
    const darts = buildClaimTheBoardDartsForHitCount(1, 4, AroundTheClockAimMode.Singles)

    expect(darts).toHaveLength(3)
    expect(darts[0]?.multiplier).toBe(DartMultiplier.Single)
    expect(darts[1]?.multiplier).toBe(DartMultiplier.Miss)
    expect(darts[2]?.multiplier).toBe(DartMultiplier.Miss)
  })
})
