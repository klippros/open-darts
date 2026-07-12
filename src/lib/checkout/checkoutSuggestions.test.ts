import { describe, expect, it } from 'vitest'
import {
  getVisitDartSlots,
  isBogeyCheckoutScore,
  isInCheckoutRange,
  normalizeCheckoutTarget,
  suggestCheckoutPath,
} from './checkoutSuggestions'
import { DartMultiplier } from '../../types/dart'
import { numberDart } from '../testHelpers'

const doubleOutRules = {
  doubleIn: false,
  doubleOut: true,
}

describe('checkoutSuggestions', () => {
  it('detects checkout range scores', () => {
    expect(isInCheckoutRange(40, doubleOutRules)).toBe(true)
    expect(isInCheckoutRange(200, doubleOutRules)).toBe(false)
  })

  it('suggests a one-dart finish with dart notation', () => {
    expect(suggestCheckoutPath(40, 1, doubleOutRules)).toEqual([{ label: 'D20', points: 40 }])
    expect(suggestCheckoutPath(20, 1, doubleOutRules)).toEqual([{ label: 'D10', points: 20 }])
    expect(suggestCheckoutPath(50, 1, doubleOutRules)).toEqual([{ label: 'Bull', points: 50 }])
  })

  it('prefers a single-dart finish when one is available', () => {
    expect(suggestCheckoutPath(50, 2, doubleOutRules)).toEqual([{ label: 'Bull', points: 50 }])
    expect(suggestCheckoutPath(32, 3, doubleOutRules)).toEqual([{ label: 'D16', points: 32 }])
  })

  it('uses the PDC table for common two-dart finishes', () => {
    expect(suggestCheckoutPath(60, 2, doubleOutRules)).toEqual([
      { label: '20', points: 20 },
      { label: 'D20', points: 40 },
    ])
    expect(suggestCheckoutPath(56, 2, doubleOutRules)).toEqual([
      { label: '16', points: 16 },
      { label: 'D20', points: 40 },
    ])
  })

  it('fills thrown and suggested visit dart slots with dart notation', () => {
    const slots = getVisitDartSlots(100, [numberDart(20, DartMultiplier.Triple)], doubleOutRules)

    expect(slots[0]).toMatchObject({ kind: 'thrown', label: 'T20' })
    expect(slots[1]).toMatchObject({ kind: 'suggested', label: 'D20' })
    expect(slots[2]).toMatchObject({ kind: 'empty', label: null })
  })

  it('suggests the PDC three-dart finish for 170', () => {
    const path = suggestCheckoutPath(170, 3, doubleOutRules)

    expect(path).toEqual([
      { label: 'T20', points: 60 },
      { label: 'T20', points: 60 },
      { label: 'Bull', points: 50 },
    ])
  })

  it('identifies bogey checkout scores', () => {
    expect(isBogeyCheckoutScore(169, doubleOutRules)).toBe(true)
    expect(isBogeyCheckoutScore(168, doubleOutRules)).toBe(true)
    expect(isBogeyCheckoutScore(159, doubleOutRules)).toBe(true)
    expect(isBogeyCheckoutScore(162, doubleOutRules)).toBe(true)
    expect(isBogeyCheckoutScore(170, doubleOutRules)).toBe(false)
    expect(isBogeyCheckoutScore(171, doubleOutRules)).toBe(false)
  })

  it('caps checkout targets at 170', () => {
    expect(normalizeCheckoutTarget(181, doubleOutRules, { prefer: 'up' })).toBe(170)
    expect(normalizeCheckoutTarget(200, doubleOutRules, { prefer: 'up' })).toBe(170)
  })

  it('skips bogey numbers when advancing targets', () => {
    expect(normalizeCheckoutTarget(169, doubleOutRules, { prefer: 'up' })).toBe(170)
  })

  it('skips bogey numbers when lowering targets', () => {
    expect(normalizeCheckoutTarget(169, doubleOutRules, { prefer: 'down' })).toBe(167)
  })
})
