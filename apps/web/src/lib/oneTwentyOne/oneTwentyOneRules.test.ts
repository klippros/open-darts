import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { resolveOneTwentyOneRoundVisit } from './oneTwentyOneRules'
import { DEFAULT_ONE_TWENTY_ONE_CONFIG } from './oneTwentyOneConfig'
import { numberDart, bullDart } from '../testHelpers'

const config = DEFAULT_ONE_TWENTY_ONE_CONFIG

const baseContext = {
  roundTarget: 121,
  remaining: 121,
  visitsOnTarget: 0,
  lives: 3,
  peakTarget: 121,
}

const checkout121 = [
  numberDart(20, DartMultiplier.Triple),
  numberDart(17, DartMultiplier.Triple),
  numberDart(5, DartMultiplier.Double),
]

const scoringVisit = [
  numberDart(20, DartMultiplier.Single),
  numberDart(20, DartMultiplier.Single),
  numberDart(20, DartMultiplier.Single),
]

describe('resolveOneTwentyOneRoundVisit', () => {
  it('advances the round target by one after a successful checkout', () => {
    const outcome = resolveOneTwentyOneRoundVisit(baseContext, checkout121, config)

    expect(outcome).toMatchObject({
      roundTargetAfter: 122,
      remainingAfter: 122,
      visitsOnTargetAfter: 0,
      livesAfter: 4,
      peakTargetAfter: 122,
      checkout: true,
      lifeGained: true,
      roundFailed: false,
    })
  })

  it('carries remaining score into the next visit within a round', () => {
    const outcome = resolveOneTwentyOneRoundVisit(baseContext, scoringVisit, config)

    expect(outcome).toMatchObject({
      roundTargetAfter: 121,
      remainingAfter: 61,
      visitsOnTargetAfter: 1,
      livesAfter: 3,
      roundFailed: false,
    })
  })

  it('continues from carried remaining on a later visit in the same round', () => {
    const first = resolveOneTwentyOneRoundVisit(baseContext, scoringVisit, config)
    const second = resolveOneTwentyOneRoundVisit(
      {
        roundTarget: first.roundTargetAfter,
        remaining: first.remainingAfter,
        visitsOnTarget: first.visitsOnTargetAfter,
        lives: first.livesAfter,
        peakTarget: first.peakTargetAfter,
      },
      [
        numberDart(20, DartMultiplier.Single),
        numberDart(20, DartMultiplier.Single),
        numberDart(5, DartMultiplier.Single),
      ],
      config,
    )

    expect(second).toMatchObject({
      roundTargetAfter: 121,
      remainingAfter: 16,
      visitsOnTargetAfter: 2,
      roundFailed: false,
    })
  })

  it('gains a life only on the first visit checkout', () => {
    const outcome = resolveOneTwentyOneRoundVisit(
      { ...baseContext, visitsOnTarget: 1, remaining: 121 },
      checkout121,
      config,
    )

    expect(outcome).toMatchObject({
      roundTargetAfter: 122,
      livesAfter: 3,
      lifeGained: false,
    })
  })

  it('keeps the round target after a bust on an early visit', () => {
    const outcome = resolveOneTwentyOneRoundVisit(
      baseContext,
      [
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
      ],
      config,
    )

    expect(outcome).toMatchObject({
      roundTargetAfter: 121,
      remainingAfter: 121,
      visitsOnTargetAfter: 1,
      livesAfter: 3,
      bust: true,
      roundFailed: false,
      lifeLost: false,
    })
  })

  it('drops the round target and loses a life after three visits without checkout', () => {
    let context = baseContext

    for (let visit = 0; visit < 2; visit += 1) {
      const step = resolveOneTwentyOneRoundVisit(context, scoringVisit, config)
      context = {
        roundTarget: step.roundTargetAfter,
        remaining: step.remainingAfter,
        visitsOnTarget: step.visitsOnTargetAfter,
        lives: step.livesAfter,
        peakTarget: step.peakTargetAfter,
      }
    }

    const outcome = resolveOneTwentyOneRoundVisit(context, scoringVisit, config)

    expect(outcome).toMatchObject({
      roundTargetAfter: 120,
      remainingAfter: 120,
      visitsOnTargetAfter: 0,
      livesAfter: 2,
      roundFailed: true,
      lifeLost: true,
    })
  })

  it('allows lives to exceed the starting count', () => {
    const first = resolveOneTwentyOneRoundVisit(baseContext, checkout121, config)
    const checkout122 = [
      numberDart(20, DartMultiplier.Triple),
      numberDart(18, DartMultiplier.Triple),
      numberDart(4, DartMultiplier.Double),
    ]
    const second = resolveOneTwentyOneRoundVisit(
      {
        roundTarget: first.roundTargetAfter,
        remaining: first.remainingAfter,
        visitsOnTarget: 0,
        lives: first.livesAfter,
        peakTarget: first.peakTargetAfter,
      },
      checkout122,
      config,
    )

    expect(second.livesAfter).toBe(5)
  })

  it('can drop below the start score on failure', () => {
    const outcome = resolveOneTwentyOneRoundVisit(
      { ...baseContext, visitsOnTarget: 2, remaining: 16 },
      scoringVisit,
      config,
    )

    expect(outcome.roundTargetAfter).toBe(120)
    expect(outcome.remainingAfter).toBe(120)
  })

  it('can advance above 170 without capping the target', () => {
    const checkout170 = [
      numberDart(20, DartMultiplier.Triple),
      numberDart(20, DartMultiplier.Triple),
      bullDart(),
    ]
    const outcome = resolveOneTwentyOneRoundVisit(
      { ...baseContext, roundTarget: 170, remaining: 170, peakTarget: 170 },
      checkout170,
      config,
    )

    expect(outcome.roundTargetAfter).toBe(171)
    expect(outcome.peakTargetAfter).toBe(171)
  })

  it('ends with zero lives after the last life is lost', () => {
    const outcome = resolveOneTwentyOneRoundVisit(
      { ...baseContext, visitsOnTarget: 2, remaining: 16, lives: 1 },
      scoringVisit,
      config,
    )

    expect(outcome.livesAfter).toBe(0)
    expect(outcome.lifeLost).toBe(true)
  })
})
