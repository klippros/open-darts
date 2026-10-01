import { describe, expect, it } from 'vitest'
import { HunterOutcome } from '../types/hunter'
import { buildHunterThrow } from './buildHunterDarts'
import { getHunterFieldIndexForNumber, getHunterFieldNumber } from './hunterClock'
import { resolveHunterDart, resolveHunterVisit } from './hunterRules'

describe('hunterRules', () => {
  const on1 = getHunterFieldIndexForNumber(1)
  const on19 = getHunterFieldIndexForNumber(19)
  const on18 = getHunterFieldIndexForNumber(18)

  it('advances by ring on the aimed field and ignores misses', () => {
    expect(resolveHunterDart(on1, on19, buildHunterThrow(HunterOutcome.Miss, 1))).toMatchObject({
      advances: 0,
      fieldIndexAfter: on1,
      caught: false,
    })
    expect(resolveHunterDart(on1, on19, buildHunterThrow(HunterOutcome.Single, 1))).toMatchObject({
      advances: 1,
      fieldIndexAfter: on18,
      caught: false,
    })
    expect(resolveHunterDart(on1, on19, buildHunterThrow(HunterOutcome.Double, 1))).toMatchObject({
      advances: 2,
      caught: false,
    })
    expect(resolveHunterDart(on1, on19, buildHunterThrow(HunterOutcome.Triple, 1))).toMatchObject({
      advances: 3,
      caught: false,
    })
  })

  it('treats a hit on the wrong number as a miss', () => {
    expect(resolveHunterDart(on1, on19, buildHunterThrow(HunterOutcome.Single, 18))).toMatchObject({
      advances: 0,
      caught: false,
    })
  })

  it('catches when landing on or passing the opponent', () => {
    expect(resolveHunterDart(on1, on18, buildHunterThrow(HunterOutcome.Single, 1))).toMatchObject({
      caught: true,
      fieldIndexAfter: on18,
    })
    expect(resolveHunterDart(on1, on18, buildHunterThrow(HunterOutcome.Double, 1))).toMatchObject({
      caught: true,
    })
    expect(
      getHunterFieldNumber(
        resolveHunterDart(on1, on18, buildHunterThrow(HunterOutcome.Double, 1)).fieldIndexAfter,
      ),
    ).toBe(4)
  })

  it('accumulates advances across a visit without catching when short of the gap', () => {
    // Distance 1 → 19 is 10; 3+3+3 = 9 → land on 3
    const visit = resolveHunterVisit(on1, on19, [
      buildHunterThrow(HunterOutcome.Triple, 1),
      buildHunterThrow(HunterOutcome.Triple, 13),
      buildHunterThrow(HunterOutcome.Triple, 15),
    ])

    expect(visit.checkout).toBe(false)
    expect(visit.advances).toBe(9)
    expect(getHunterFieldNumber(visit.fieldIndexAfter)).toBe(3)
  })

  it('catches mid-visit when a later dart closes the gap', () => {
    const visit = resolveHunterVisit(on1, on18, [
      buildHunterThrow(HunterOutcome.Miss, 1),
      buildHunterThrow(HunterOutcome.Double, 1),
    ])

    expect(visit.checkout).toBe(true)
    expect(visit.advances).toBe(2)
    expect(visit.visitScore).toBe(2)
  })

  it('wraps past 20 back to 1', () => {
    const on20 = getHunterFieldIndexForNumber(20)
    const on5 = getHunterFieldIndexForNumber(5)

    expect(resolveHunterDart(on20, on5, buildHunterThrow(HunterOutcome.Single, 20))).toMatchObject({
      advances: 1,
      fieldIndexAfter: on1,
      caught: false,
    })
  })
})
