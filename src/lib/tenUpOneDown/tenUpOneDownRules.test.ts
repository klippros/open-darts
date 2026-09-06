import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { resolveTenUpOneDownVisit } from './tenUpOneDownRules'
import { numberDart, bullDart } from '../testHelpers'

const config = {
  startScore: 60,
  incrementUp: 10,
  decrementDown: 1,
  minScore: 2,
  doubleOut: true,
}

describe('tenUpOneDownRules', () => {
  it('advances the target by 10 after a successful checkout', () => {
    const outcome = resolveTenUpOneDownVisit(
      60,
      [numberDart(20, DartMultiplier.Single), numberDart(20, DartMultiplier.Double)],
      config,
    )

    expect(outcome).toEqual({
      targetScoreAfter: 70,
      bust: false,
      checkout: true,
      completed: false,
      won: false,
    })
  })

  it('drops the target by 1 after a bust', () => {
    const outcome = resolveTenUpOneDownVisit(60, [numberDart(20, DartMultiplier.Triple)], config)

    expect(outcome).toEqual({
      targetScoreAfter: 59,
      bust: true,
      checkout: false,
      completed: false,
      won: false,
    })
  })

  it('drops the target by 1 when three darts miss the checkout', () => {
    const outcome = resolveTenUpOneDownVisit(
      60,
      [
        numberDart(20, DartMultiplier.Single),
        numberDart(20, DartMultiplier.Single),
        numberDart(10, DartMultiplier.Single),
      ],
      config,
    )

    expect(outcome).toEqual({
      targetScoreAfter: 59,
      bust: false,
      checkout: false,
      completed: false,
      won: false,
    })
  })

  it('ends the game when failing at the minimum score', () => {
    const outcome = resolveTenUpOneDownVisit(2, [numberDart(1, DartMultiplier.Single)], config)

    expect(outcome).toEqual({
      targetScoreAfter: 2,
      bust: true,
      checkout: false,
      completed: true,
      won: false,
    })
  })

  it('does not end mid-visit at the minimum score', () => {
    const outcome = resolveTenUpOneDownVisit(2, [], config)

    expect(outcome).toEqual({
      targetScoreAfter: 2,
      bust: false,
      checkout: false,
      completed: false,
      won: false,
    })
  })

  it('climbs after checking out the minimum score', () => {
    const outcome = resolveTenUpOneDownVisit(2, [numberDart(1, DartMultiplier.Double)], config)

    expect(outcome).toEqual({
      targetScoreAfter: 12,
      bust: false,
      checkout: true,
      completed: false,
      won: false,
    })
  })

  it('skips bogey numbers when dropping the target', () => {
    const outcome = resolveTenUpOneDownVisit(
      170,
      [
        numberDart(20, DartMultiplier.Single),
        numberDart(20, DartMultiplier.Single),
        numberDart(10, DartMultiplier.Single),
      ],
      config,
    )

    expect(outcome).toEqual({
      targetScoreAfter: 167,
      bust: false,
      checkout: false,
      completed: false,
      won: false,
    })
  })

  it('caps the next target at 170 after checkout', () => {
    const outcome = resolveTenUpOneDownVisit(
      161,
      [numberDart(20, DartMultiplier.Triple), numberDart(17, DartMultiplier.Triple), bullDart()],
      { ...config, startScore: 161 },
    )

    expect(outcome).toEqual({
      targetScoreAfter: 170,
      bust: false,
      checkout: true,
      completed: false,
      won: false,
    })
  })

  it('wins after checking out 170', () => {
    const outcome = resolveTenUpOneDownVisit(
      170,
      [numberDart(20, DartMultiplier.Triple), numberDart(20, DartMultiplier.Triple), bullDart()],
      config,
    )

    expect(outcome).toEqual({
      targetScoreAfter: 170,
      bust: false,
      checkout: true,
      completed: true,
      won: true,
    })
  })
})
