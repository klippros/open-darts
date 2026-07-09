import { describe, expect, it } from 'vitest'
import {
  getVisitDartSlots,
  isBogeyCheckoutScore,
  isInCheckoutRange,
  normalizeCheckoutTarget,
  suggestCheckoutPath,
} from './x01CheckoutSuggestions'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'

const doubleOutConfig = {
  startScore: 501,
  doubleIn: false,
  doubleOut: true,
}

describe('x01CheckoutSuggestions', () => {
  it('detects checkout range scores', () => {
    expect(isInCheckoutRange(40, doubleOutConfig)).toBe(true)
    expect(isInCheckoutRange(200, doubleOutConfig)).toBe(false)
  })

  it('suggests a one-dart finish with dart notation', () => {
    expect(suggestCheckoutPath(40, 1, doubleOutConfig)).toEqual([{ label: 'D20', points: 40 }])
    expect(suggestCheckoutPath(20, 1, doubleOutConfig)).toEqual([{ label: 'D10', points: 20 }])
    expect(suggestCheckoutPath(50, 1, doubleOutConfig)).toEqual([{ label: 'Bull', points: 50 }])
  })

  it('finishes two-dart checkouts on a double', () => {
    const path = suggestCheckoutPath(60, 2, doubleOutConfig)

    expect(path).not.toBeNull()
    expect(path?.at(-1)).toMatchObject({ label: 'D3', points: 6 })
  })

  it('fills thrown and suggested visit dart slots with dart notation', () => {
    const slots = getVisitDartSlots(100, [numberDart(20, DartMultiplier.Triple)], doubleOutConfig)

    expect(slots[0]).toMatchObject({ kind: 'thrown', label: 'T20' })
    expect(slots[1]).toMatchObject({ kind: 'suggested', label: 'D20' })
    expect(slots[2]).toMatchObject({ kind: 'empty', label: null })
  })

  it('suggests multi-dart finishes with dart notation', () => {
    const path = suggestCheckoutPath(170, 3, doubleOutConfig)

    expect(path).toEqual([
      { label: 'T20', points: 60 },
      { label: 'T20', points: 60 },
      { label: 'Bull', points: 50 },
    ])
  })

  it('identifies bogey checkout scores', () => {
    expect(isBogeyCheckoutScore(169, doubleOutConfig)).toBe(true)
    expect(isBogeyCheckoutScore(168, doubleOutConfig)).toBe(true)
    expect(isBogeyCheckoutScore(170, doubleOutConfig)).toBe(false)
    expect(isBogeyCheckoutScore(171, doubleOutConfig)).toBe(false)
  })

  it('caps checkout targets at 170', () => {
    expect(normalizeCheckoutTarget(181, doubleOutConfig, { prefer: 'up' })).toBe(170)
    expect(normalizeCheckoutTarget(200, doubleOutConfig, { prefer: 'up' })).toBe(170)
  })

  it('skips bogey numbers when advancing targets', () => {
    expect(normalizeCheckoutTarget(169, doubleOutConfig, { prefer: 'up' })).toBe(170)
  })

  it('skips bogey numbers when lowering targets', () => {
    expect(normalizeCheckoutTarget(169, doubleOutConfig, { prefer: 'down' })).toBe(167)
  })
})
