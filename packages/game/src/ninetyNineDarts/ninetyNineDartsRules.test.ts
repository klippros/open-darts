import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../types/dart'
import { NinetyNineDartsOutcome, NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import { bullDart, missDart, numberDart, outerBullDart } from '../testHelpers'
import {
  getNinetyNineDartsDartPoints,
  getNinetyNineDartsMaxScore,
  getNinetyNineDartsOutcome,
  getNinetyNineDartsPickerOutcomes,
  getNinetyNineDartsVisitScore,
  isNinetyNineDartsTargetHit,
  NINETY_NINE_DARTS_DART_COUNT,
  resolveNinetyNineDartsVisit,
} from './ninetyNineDartsRules'

const number20 = { kind: NinetyNineDartsTargetKind.Number, value: 20 } as const
const bull = { kind: NinetyNineDartsTargetKind.Bull } as const

describe('ninetyNineDartsRules', () => {
  it('scores singles, doubles, and trebles on a number target', () => {
    expect(getNinetyNineDartsDartPoints(numberDart(20, DartMultiplier.Single), number20)).toBe(1)
    expect(getNinetyNineDartsDartPoints(numberDart(20, DartMultiplier.Double), number20)).toBe(2)
    expect(getNinetyNineDartsDartPoints(numberDart(20, DartMultiplier.Triple), number20)).toBe(3)
    expect(getNinetyNineDartsDartPoints(missDart(), number20)).toBe(0)
    expect(getNinetyNineDartsDartPoints(numberDart(19, DartMultiplier.Triple), number20)).toBe(0)
  })

  it('scores outer bull as single and inner bull as double', () => {
    expect(getNinetyNineDartsDartPoints(outerBullDart(DartMultiplier.Single), bull)).toBe(1)
    expect(getNinetyNineDartsDartPoints(bullDart(), bull)).toBe(2)
    expect(getNinetyNineDartsDartPoints(missDart(), bull)).toBe(0)
    expect(getNinetyNineDartsDartPoints(numberDart(20, DartMultiplier.Single), bull)).toBe(0)
  })

  it('treats wrong-segment darts as misses', () => {
    expect(getNinetyNineDartsOutcome(numberDart(5, DartMultiplier.Double), number20)).toBe(
      NinetyNineDartsOutcome.Miss,
    )
    expect(isNinetyNineDartsTargetHit(numberDart(5, DartMultiplier.Double), number20)).toBe(false)
  })

  it('sums visit scores for number and bull targets', () => {
    expect(
      getNinetyNineDartsVisitScore(
        [
          numberDart(20, DartMultiplier.Single),
          numberDart(20, DartMultiplier.Double),
          numberDart(20, DartMultiplier.Triple),
        ],
        number20,
      ),
    ).toBe(6)

    expect(
      getNinetyNineDartsVisitScore(
        [outerBullDart(DartMultiplier.Single), bullDart(), missDart()],
        bull,
      ),
    ).toBe(3)
  })

  it('completes after 99 darts', () => {
    const beforeCheckout = resolveNinetyNineDartsVisit(
      290,
      NINETY_NINE_DARTS_DART_COUNT - 3,
      [
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Triple),
      ],
      number20,
    )

    expect(beforeCheckout).toMatchObject({
      scoreAfter: 299,
      dartsThrownAfter: 99,
      visitScore: 9,
      checkout: true,
    })

    const midGame = resolveNinetyNineDartsVisit(
      0,
      0,
      [missDart(), missDart(), missDart()],
      number20,
    )
    expect(midGame).toMatchObject({
      scoreAfter: 0,
      dartsThrownAfter: 3,
      visitScore: 0,
      checkout: false,
    })
  })

  it('exposes max scores and picker outcomes', () => {
    expect(getNinetyNineDartsMaxScore(number20)).toBe(297)
    expect(getNinetyNineDartsMaxScore(bull)).toBe(198)
    expect(getNinetyNineDartsPickerOutcomes(number20)).toEqual([
      NinetyNineDartsOutcome.Miss,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Triple,
      NinetyNineDartsOutcome.Double,
    ])
    expect(getNinetyNineDartsPickerOutcomes(bull)).toEqual([
      NinetyNineDartsOutcome.Miss,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Double,
    ])
  })
})
