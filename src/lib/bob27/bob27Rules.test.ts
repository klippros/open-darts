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

  it('adds target value per hit and advances after every visit', () => {
    const oneHit = resolveBob27Visit(27, 0, [numberDart(1, DartMultiplier.Double)])
    expect(oneHit).toMatchObject({
      scoreAfter: 29,
      targetIndexAfter: 1,
      hit: true,
      hitCount: 1,
      visitScore: 2,
      checkout: false,
    })

    const twoHits = resolveBob27Visit(27, 2, [
      numberDart(3, DartMultiplier.Double),
      numberDart(3, DartMultiplier.Double),
      numberDart(3, DartMultiplier.Single),
    ])
    expect(twoHits).toMatchObject({
      scoreAfter: 39,
      targetIndexAfter: 3,
      hit: true,
      hitCount: 2,
      visitScore: 12,
    })
  })

  it('subtracts the double once on a full miss and still advances', () => {
    const miss = resolveBob27Visit(27, 3, [
      numberDart(4, DartMultiplier.Single),
      numberDart(4, DartMultiplier.Single),
      numberDart(4, DartMultiplier.Single),
    ])
    expect(miss).toMatchObject({
      scoreAfter: 19,
      targetIndexAfter: 4,
      hit: false,
      hitCount: 0,
      visitScore: -8,
      checkout: false,
    })
  })

  it('allows the score to go negative', () => {
    const miss = resolveBob27Visit(4, 3, [
      numberDart(20, DartMultiplier.Miss),
      numberDart(20, DartMultiplier.Miss),
      numberDart(20, DartMultiplier.Miss),
    ])
    expect(miss).toMatchObject({ scoreAfter: -4, visitScore: -8, targetIndexAfter: 4 })
  })

  it('finishes after the bull visit whether hit or miss', () => {
    const hit = resolveBob27Visit(100, 20, [bullDart()])
    expect(hit).toMatchObject({ checkout: true, targetIndexAfter: 21, hitCount: 1, visitScore: 50 })
    expect(isBob27TargetHit(bullDart(), 20)).toBe(true)

    const miss = resolveBob27Visit(100, 20, [
      numberDart(20, DartMultiplier.Miss),
      numberDart(20, DartMultiplier.Miss),
      numberDart(20, DartMultiplier.Miss),
    ])
    expect(miss).toMatchObject({
      checkout: true,
      targetIndexAfter: 21,
      hitCount: 0,
      visitScore: -50,
    })
  })
})
