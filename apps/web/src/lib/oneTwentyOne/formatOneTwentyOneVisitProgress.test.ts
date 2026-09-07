import { describe, expect, it } from 'vitest'
import { formatOneTwentyOneVisitProgressLabel } from './formatOneTwentyOneVisitProgress'

describe('formatOneTwentyOneVisitProgressLabel', () => {
  it('formats visit progress for the current round', () => {
    expect(formatOneTwentyOneVisitProgressLabel(2, 3)).toBe('Visit 2 / 3')
  })
})
