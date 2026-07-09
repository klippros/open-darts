import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { resolveOneTwentyOneVisit } from './oneTwentyOneRules'
import { numberDart } from '../testHelpers'

const config = { startScore: 121, increment: 20, doubleOut: true }

describe('oneTwentyOneRules', () => {
  it('advances the target after a successful checkout', () => {
    const outcome = resolveOneTwentyOneVisit(
      121,
      [
        numberDart(20, DartMultiplier.Triple),
        numberDart(17, DartMultiplier.Triple),
        numberDart(5, DartMultiplier.Double),
      ],
      config,
    )

    expect(outcome).toEqual({
      targetScoreAfter: 141,
      bust: false,
      checkout: true,
    })
  })

  it('resets to the start score on a bust', () => {
    const outcome = resolveOneTwentyOneVisit(
      121,
      [
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
      ],
      config,
    )

    expect(outcome).toEqual({
      targetScoreAfter: 121,
      bust: true,
      checkout: false,
    })
  })
})
