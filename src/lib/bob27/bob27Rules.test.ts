import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { getBob27Target, isBob27TargetHit, resolveBob27Visit } from './bob27Rules'
import { bullDart, numberDart } from '../testHelpers'

describe('bob27Rules', () => {
  it('describes targets in order from D1 to bull', () => {
    expect(getBob27Target(0)).toEqual({ label: 'D1', value: 2 })
    expect(getBob27Target(19)).toEqual({ label: 'D20', value: 40 })
    expect(getBob27Target(20)).toEqual({ label: 'Bull', value: 50 })
  })

  it('adds target value on a hit and subtracts on a miss', () => {
    const hit = resolveBob27Visit(27, 0, [numberDart(1, DartMultiplier.Double)])
    expect(hit).toMatchObject({ scoreAfter: 29, targetIndexAfter: 1, hit: true, checkout: false })

    const miss = resolveBob27Visit(27, 0, [numberDart(1, DartMultiplier.Single)])
    expect(miss).toMatchObject({ scoreAfter: 25, targetIndexAfter: 0, hit: false, checkout: false })
  })

  it('finishes when bull is hit', () => {
    const checkout = resolveBob27Visit(100, 20, [bullDart()])
    expect(checkout).toMatchObject({ checkout: true, targetIndexAfter: 21 })
    expect(isBob27TargetHit(bullDart(), 20)).toBe(true)
  })
})
