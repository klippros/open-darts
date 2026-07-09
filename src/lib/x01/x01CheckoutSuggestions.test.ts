import { describe, expect, it } from 'vitest'
import { getVisitDartSlots, isInCheckoutRange, suggestCheckoutPath } from './x01CheckoutSuggestions'

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

  it('suggests a one-dart finish', () => {
    expect(suggestCheckoutPath(40, 1, doubleOutConfig)).toEqual([40])
  })

  it('fills thrown and suggested visit dart slots', () => {
    const slots = getVisitDartSlots(100, [{ points: 60 }], doubleOutConfig)

    expect(slots[0]).toMatchObject({ kind: 'thrown', points: 60 })
    expect(slots[1]).toMatchObject({ kind: 'suggested', points: 40 })
    expect(slots[2]).toMatchObject({ kind: 'empty', points: null })
  })
})
