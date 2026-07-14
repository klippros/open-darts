import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import {
  getAroundTheClockTargetLabel,
  getAroundTheClockVisitScore,
  isAroundTheClockTargetHit,
  resolveAroundTheClockVisit,
} from './aroundTheClockRules'
import { bullDart, missDart, numberDart, outerBullDart } from '../testHelpers'

describe('aroundTheClockRules', () => {
  it('labels targets from 1 through bull', () => {
    expect(getAroundTheClockTargetLabel(0)).toBe('1')
    expect(getAroundTheClockTargetLabel(19)).toBe('20')
    expect(getAroundTheClockTargetLabel(20)).toBe('Bull')
  })

  it('advances on hits and can finish on bull in one visit', () => {
    const outcome = resolveAroundTheClockVisit(
      19,
      [numberDart(20, DartMultiplier.Single), bullDart()],
      AroundTheClockAimMode.Any,
    )

    expect(outcome).toEqual({ targetIndexAfter: 21, checkout: true })
  })

  it('accepts outer bull or inner bull for any-mode final target', () => {
    expect(
      isAroundTheClockTargetHit(
        outerBullDart(DartMultiplier.Single),
        20,
        AroundTheClockAimMode.Any,
      ),
    ).toBe(true)
    expect(isAroundTheClockTargetHit(bullDart(), 20, AroundTheClockAimMode.Any)).toBe(true)
    expect(
      isAroundTheClockTargetHit(
        numberDart(20, DartMultiplier.Single),
        20,
        AroundTheClockAimMode.Any,
      ),
    ).toBe(false)
  })

  it('requires singles on numbers in singles mode', () => {
    expect(
      isAroundTheClockTargetHit(
        numberDart(5, DartMultiplier.Single),
        4,
        AroundTheClockAimMode.Singles,
      ),
    ).toBe(true)
    expect(
      isAroundTheClockTargetHit(
        numberDart(5, DartMultiplier.Double),
        4,
        AroundTheClockAimMode.Singles,
      ),
    ).toBe(false)
  })

  it('requires doubles on numbers in doubles mode', () => {
    expect(
      isAroundTheClockTargetHit(
        numberDart(5, DartMultiplier.Double),
        4,
        AroundTheClockAimMode.Doubles,
      ),
    ).toBe(true)
    expect(
      isAroundTheClockTargetHit(
        numberDart(5, DartMultiplier.Single),
        4,
        AroundTheClockAimMode.Doubles,
      ),
    ).toBe(false)
  })

  it('requires trebles on numbers in trebles mode', () => {
    expect(
      isAroundTheClockTargetHit(
        numberDart(5, DartMultiplier.Triple),
        4,
        AroundTheClockAimMode.Trebles,
      ),
    ).toBe(true)
    expect(
      isAroundTheClockTargetHit(
        numberDart(5, DartMultiplier.Single),
        4,
        AroundTheClockAimMode.Trebles,
      ),
    ).toBe(false)
  })

  it('stays on the same target when all darts miss', () => {
    const outcome = resolveAroundTheClockVisit(
      5,
      [numberDart(7, DartMultiplier.Single)],
      AroundTheClockAimMode.Any,
    )

    expect(outcome).toEqual({ targetIndexAfter: 5, checkout: false })
  })

  it('only counts points from darts that hit the current target', () => {
    expect(
      getAroundTheClockVisitScore(
        4,
        [numberDart(20, DartMultiplier.Triple), numberDart(5, DartMultiplier.Single)],
        AroundTheClockAimMode.Any,
      ),
    ).toBe(5)

    expect(
      getAroundTheClockVisitScore(
        0,
        [
          numberDart(1, DartMultiplier.Single),
          numberDart(2, DartMultiplier.Single),
          numberDart(3, DartMultiplier.Single),
        ],
        AroundTheClockAimMode.Any,
      ),
    ).toBe(6)
  })

  it('advances through multiple targets in one visit', () => {
    const outcome = resolveAroundTheClockVisit(
      0,
      [numberDart(1, DartMultiplier.Single), numberDart(2, DartMultiplier.Single), missDart()],
      AroundTheClockAimMode.Any,
    )

    expect(outcome).toEqual({ targetIndexAfter: 2, checkout: false })
  })
})
