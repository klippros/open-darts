import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { resolveTenUpOneDownVisit } from './tenUpOneDownRules'
import { numberDart } from '../testHelpers'

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
    })
  })

  it('drops the target by 1 after a bust', () => {
    const outcome = resolveTenUpOneDownVisit(60, [numberDart(20, DartMultiplier.Triple)], config)

    expect(outcome).toEqual({
      targetScoreAfter: 59,
      bust: true,
      checkout: false,
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
    })
  })

  it('does not drop below the minimum score', () => {
    const outcome = resolveTenUpOneDownVisit(2, [numberDart(1, DartMultiplier.Single)], config)

    expect(outcome).toEqual({
      targetScoreAfter: 2,
      bust: true,
      checkout: false,
    })
  })
})
