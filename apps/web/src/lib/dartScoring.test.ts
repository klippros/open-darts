import { describe, expect, it } from 'vitest'
import { DartMultiplier, DartSegmentType } from '../types/dart'
import { calculateDartPoints, createDartThrow, isDoubleDart, sumDartPoints } from './dartScoring'
import { bullDart, missDart, numberDart, outerBullDart } from './testHelpers'

describe('calculateDartPoints', () => {
  it('scores singles, doubles, and triples on numbers', () => {
    expect(
      calculateDartPoints({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Single),
    ).toBe(20)
    expect(
      calculateDartPoints({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Double),
    ).toBe(40)
    expect(
      calculateDartPoints({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Triple),
    ).toBe(60)
  })

  it('scores outer bull and inner bull', () => {
    expect(calculateDartPoints({ type: DartSegmentType.OuterBull }, DartMultiplier.Single)).toBe(25)
    expect(calculateDartPoints({ type: DartSegmentType.OuterBull }, DartMultiplier.Double)).toBe(50)
    expect(calculateDartPoints({ type: DartSegmentType.Bull }, DartMultiplier.Single)).toBe(50)
  })

  it('returns zero for misses and invalid combinations', () => {
    expect(
      calculateDartPoints({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss),
    ).toBe(0)
    expect(
      calculateDartPoints({ type: DartSegmentType.Number, value: 0 }, DartMultiplier.Single),
    ).toBe(0)
    expect(calculateDartPoints({ type: DartSegmentType.Bull }, DartMultiplier.Triple)).toBe(0)
  })
})

describe('isDoubleDart', () => {
  it('treats doubles and inner bull as doubles for checkout', () => {
    expect(isDoubleDart(numberDart(20, DartMultiplier.Double))).toBe(true)
    expect(isDoubleDart(bullDart())).toBe(true)
  })

  it('rejects singles, triples, and misses', () => {
    expect(isDoubleDart(numberDart(20, DartMultiplier.Single))).toBe(false)
    expect(isDoubleDart(numberDart(20, DartMultiplier.Triple))).toBe(false)
    expect(isDoubleDart(missDart())).toBe(false)
    expect(isDoubleDart(outerBullDart(DartMultiplier.Single))).toBe(false)
  })
})

describe('createDartThrow', () => {
  it('stores calculated points on the dart', () => {
    const dart = createDartThrow(
      { type: DartSegmentType.Number, value: 19 },
      DartMultiplier.Triple,
      '2026-01-01T00:00:00.000Z',
    )

    expect(dart.points).toBe(57)
    expect(dart.timestamp).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('sumDartPoints', () => {
  it('sums visit dart points', () => {
    expect(
      sumDartPoints([
        numberDart(20, DartMultiplier.Triple),
        numberDart(20, DartMultiplier.Single),
        missDart(),
      ]),
    ).toBe(80)
  })
})
