import { describe, expect, it } from 'vitest'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { DartMultiplier } from '../../types/dart'
import { bullDart, missDart, numberDart, outerBullDart } from '../testHelpers'
import {
  buildDartsForMissAll,
  buildDartsForOrdinalHit,
  createHitDartForTarget,
  getAroundTheClockAvailableOrdinals,
  getAroundTheClockCurrentTargetIndex,
  getAroundTheClockDartsLeft,
  getAroundTheClockThrownSlotLabel,
  getAroundTheClockVisitDartSlots,
} from './buildAroundTheClockDarts'
import { isAroundTheClockTargetHit, resolveAroundTheClockVisit } from './aroundTheClockRules'

describe('buildAroundTheClockDarts', () => {
  it('creates valid hit darts for each aim mode', () => {
    for (const aimMode of Object.values(AroundTheClockAimMode)) {
      expect(isAroundTheClockTargetHit(createHitDartForTarget(4, aimMode), 4, aimMode)).toBe(true)
      expect(isAroundTheClockTargetHit(createHitDartForTarget(20, aimMode), 20, aimMode)).toBe(true)
    }
  })

  it('uses canonical segments for each aim mode', () => {
    const expectDartShape = (
      dart: ReturnType<typeof createHitDartForTarget>,
      expected: ReturnType<typeof numberDart>,
    ) => {
      expect(dart.segment).toEqual(expected.segment)
      expect(dart.multiplier).toBe(expected.multiplier)
      expect(dart.points).toBe(expected.points)
    }

    expectDartShape(
      createHitDartForTarget(4, AroundTheClockAimMode.Singles),
      numberDart(5, DartMultiplier.Single),
    )
    expectDartShape(
      createHitDartForTarget(4, AroundTheClockAimMode.Doubles),
      numberDart(5, DartMultiplier.Double),
    )
    expectDartShape(
      createHitDartForTarget(4, AroundTheClockAimMode.Trebles),
      numberDart(5, DartMultiplier.Triple),
    )
    expectDartShape(
      createHitDartForTarget(20, AroundTheClockAimMode.Any),
      outerBullDart(DartMultiplier.Single),
    )
    expectDartShape(createHitDartForTarget(20, AroundTheClockAimMode.Doubles), bullDart())
  })

  it('tracks darts left in the current visit', () => {
    expect(getAroundTheClockDartsLeft([])).toBe(3)
    expect(getAroundTheClockDartsLeft([missDart()])).toBe(2)
    expect(getAroundTheClockDartsLeft([missDart(), missDart(), missDart()])).toBe(0)
  })

  it('builds ordinal hits as misses followed by one hit', () => {
    const darts = buildDartsForOrdinalHit(2, 0, [], AroundTheClockAimMode.Any)

    expect(darts).toHaveLength(2)
    expect(resolveAroundTheClockVisit(0, darts, AroundTheClockAimMode.Any)).toEqual({
      targetIndexAfter: 1,
      checkout: false,
    })
  })

  it('builds only the remaining darts when part of the visit is already thrown', () => {
    const pending = [numberDart(1, DartMultiplier.Single)]
    const darts = buildDartsForOrdinalHit(2, 0, pending, AroundTheClockAimMode.Any)

    expect(darts).toHaveLength(1)
    expect(
      resolveAroundTheClockVisit(0, [...pending, ...darts], AroundTheClockAimMode.Any),
    ).toEqual({
      targetIndexAfter: 2,
      checkout: false,
    })
  })

  it('builds a full miss visit', () => {
    const darts = buildDartsForMissAll(3)

    expect(darts).toHaveLength(3)
    expect(resolveAroundTheClockVisit(5, darts, AroundTheClockAimMode.Any)).toEqual({
      targetIndexAfter: 5,
      checkout: false,
    })
  })

  it('exposes ordinals by visit position instead of darts left', () => {
    expect(getAroundTheClockAvailableOrdinals([])).toEqual([1, 2, 3])
    expect(getAroundTheClockAvailableOrdinals([missDart()])).toEqual([2, 3])
    expect(getAroundTheClockAvailableOrdinals([missDart(), missDart()])).toEqual([3])
    expect(getAroundTheClockAvailableOrdinals([missDart(), missDart(), missDart()])).toEqual([])
  })

  it('tracks the current target after pending hits', () => {
    const pending = [numberDart(1, DartMultiplier.Single)]

    expect(getAroundTheClockCurrentTargetIndex(0, pending, AroundTheClockAimMode.Any)).toBe(1)
  })

  it('labels visit slots with the thrown dart', () => {
    const slots = getAroundTheClockVisitDartSlots(
      0,
      [numberDart(1, DartMultiplier.Single), missDart()],
      AroundTheClockAimMode.Any,
    )

    expect(slots).toEqual([
      { kind: 'thrown', label: '1' },
      { kind: 'thrown', label: 'Miss' },
      { kind: 'empty', label: null },
    ])
  })

  it('labels thrown slots with the dart segment', () => {
    expect(
      getAroundTheClockThrownSlotLabel(
        0,
        [numberDart(1, DartMultiplier.Single), numberDart(2, DartMultiplier.Single)],
        AroundTheClockAimMode.Any,
        1,
      ),
    ).toBe('2')
  })
})
