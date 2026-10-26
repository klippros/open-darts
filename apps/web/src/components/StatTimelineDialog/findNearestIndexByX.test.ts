import { describe, expect, it } from 'vitest'
import { findNearestIndexByX } from './findNearestIndexByX'

describe('findNearestIndexByX', () => {
  it('picks the point with the nearer x', () => {
    expect(findNearestIndexByX(40, [10, 50, 90])).toBe(1)
    expect(findNearestIndexByX(12, [10, 50, 90])).toBe(0)
    expect(findNearestIndexByX(88, [10, 50, 90])).toBe(2)
  })

  it('prefers the lower index on a tie', () => {
    expect(findNearestIndexByX(30, [10, 50])).toBe(0)
  })

  it('returns the only plottable point', () => {
    expect(findNearestIndexByX(999, [42])).toBe(0)
  })

  it('skips points with no value', () => {
    expect(findNearestIndexByX(40, [null, 50, null, 90])).toBe(1)
    expect(findNearestIndexByX(80, [null, 50, null, 90])).toBe(3)
  })

  it('returns null when every point is missing', () => {
    expect(findNearestIndexByX(40, [null, null])).toBeNull()
    expect(findNearestIndexByX(40, [])).toBeNull()
  })
})
