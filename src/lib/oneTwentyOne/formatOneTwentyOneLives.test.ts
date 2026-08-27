import { describe, expect, it } from 'vitest'
import { formatOneTwentyOneLivesAriaLabel } from './formatOneTwentyOneLives'

describe('formatOneTwentyOneLivesAriaLabel', () => {
  it('builds an accessible lives label', () => {
    expect(formatOneTwentyOneLivesAriaLabel(0)).toBe('0 lives')
    expect(formatOneTwentyOneLivesAriaLabel(1)).toBe('1 live')
    expect(formatOneTwentyOneLivesAriaLabel(4)).toBe('4 lives')
  })
})
