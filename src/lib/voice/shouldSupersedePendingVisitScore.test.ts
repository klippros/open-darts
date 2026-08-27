import { describe, expect, it } from 'vitest'
import { shouldSupersedePendingVisitScore } from './shouldSupersedePendingVisitScore'

describe('shouldSupersedePendingVisitScore', () => {
  it('allows digit scores to grow', () => {
    expect(shouldSupersedePendingVisitScore('4', '411')).toBe(true)
    expect(shouldSupersedePendingVisitScore('41', '411')).toBe(true)
    expect(shouldSupersedePendingVisitScore('4', '4')).toBe(false)
    expect(shouldSupersedePendingVisitScore('411', '4')).toBe(false)
    expect(shouldSupersedePendingVisitScore('26', '60')).toBe(false)
  })

  it('allows spoken number phrases to grow', () => {
    expect(shouldSupersedePendingVisitScore('forty', 'forty one')).toBe(true)
    expect(shouldSupersedePendingVisitScore('one', 'one eighty')).toBe(true)
    expect(shouldSupersedePendingVisitScore('one eighty', 'one')).toBe(false)
  })
})
