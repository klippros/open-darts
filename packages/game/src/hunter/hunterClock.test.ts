import { describe, expect, it } from 'vitest'
import {
  advanceHunterFieldIndex,
  doesHunterAdvanceCatch,
  getHunterClockwiseDistance,
  getHunterFieldIndexForNumber,
  getHunterFieldNumber,
  getHunterStandingFieldIndex,
  getHunterStandingFieldNumber,
  HUNTER_CLOCK_ORDER,
  HUNTER_SECOND_FIELD,
  HUNTER_STARTER_FIELD,
} from './hunterClock'

describe('hunterClock', () => {
  it('orders fields clockwise from 1 without bull', () => {
    expect(HUNTER_CLOCK_ORDER).toEqual([
      1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20,
    ])
    expect(getHunterFieldIndexForNumber(HUNTER_STARTER_FIELD)).toBe(0)
    expect(getHunterFieldIndexForNumber(HUNTER_SECOND_FIELD)).toBe(10)
    expect(getHunterFieldNumber(0)).toBe(1)
    expect(getHunterFieldNumber(10)).toBe(19)
  })

  it('advances and wraps around the clock', () => {
    expect(advanceHunterFieldIndex(0, 1)).toBe(1)
    expect(getHunterFieldNumber(advanceHunterFieldIndex(0, 1))).toBe(18)
    expect(getHunterFieldNumber(advanceHunterFieldIndex(19, 1))).toBe(1)
    expect(getHunterFieldNumber(advanceHunterFieldIndex(19, 2))).toBe(18)
  })

  it('places standing one clockwise step before the aim field', () => {
    expect(getHunterStandingFieldNumber(1)).toBe(20)
    expect(getHunterStandingFieldNumber(18)).toBe(1)
    expect(getHunterStandingFieldNumber(19)).toBe(3)
    expect(getHunterStandingFieldIndex(getHunterFieldIndexForNumber(1))).toBe(
      getHunterFieldIndexForNumber(20),
    )
  })

  it('measures clockwise distance and catch on land or pass', () => {
    const from1 = getHunterFieldIndexForNumber(1)
    const on19 = getHunterFieldIndexForNumber(19)

    expect(getHunterClockwiseDistance(from1, on19)).toBe(10)
    expect(doesHunterAdvanceCatch(from1, on19, 9)).toBe(false)
    expect(doesHunterAdvanceCatch(from1, on19, 10)).toBe(true)
    expect(doesHunterAdvanceCatch(from1, on19, 11)).toBe(true)

    const on18 = getHunterFieldIndexForNumber(18)
    expect(doesHunterAdvanceCatch(from1, on18, 1)).toBe(true)
    expect(doesHunterAdvanceCatch(from1, on18, 2)).toBe(true)
    expect(doesHunterAdvanceCatch(from1, on18, 0)).toBe(false)
  })
})
