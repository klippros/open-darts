import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { getAroundTheClockTargetLabel, getAroundTheClockVisitScore, resolveAroundTheClockVisit } from './aroundTheClockRules'
import { bullDart, numberDart } from '../testHelpers'

describe('aroundTheClockRules', () => {
  it('labels targets from 1 through bull', () => {
    expect(getAroundTheClockTargetLabel(0)).toBe('1')
    expect(getAroundTheClockTargetLabel(19)).toBe('20')
    expect(getAroundTheClockTargetLabel(20)).toBe('Bull')
  })

  it('advances on hits and can finish on bull in one visit', () => {
    const outcome = resolveAroundTheClockVisit(19, [
      numberDart(20, DartMultiplier.Single),
      bullDart(),
    ])

    expect(outcome).toEqual({ targetIndexAfter: 21, checkout: true })
  })

  it('stays on the same target when all darts miss', () => {
    const outcome = resolveAroundTheClockVisit(5, [numberDart(7, DartMultiplier.Single)])

    expect(outcome).toEqual({ targetIndexAfter: 5, checkout: false })
  })

  it('only counts points from darts that hit the current target', () => {
    expect(
      getAroundTheClockVisitScore(4, [
        numberDart(20, DartMultiplier.Triple),
        numberDart(5, DartMultiplier.Single),
      ]),
    ).toBe(5)

    expect(
      getAroundTheClockVisitScore(0, [
        numberDart(1, DartMultiplier.Single),
        numberDart(2, DartMultiplier.Single),
        numberDart(3, DartMultiplier.Single),
      ]),
    ).toBe(6)
  })
})
