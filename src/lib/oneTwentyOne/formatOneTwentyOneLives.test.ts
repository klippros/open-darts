import { describe, expect, it } from 'vitest'
import {
  formatOneTwentyOneLives,
  formatOneTwentyOneLivesAriaLabel,
} from './formatOneTwentyOneLives'

describe('formatOneTwentyOneLives', () => {
  it('formats lives as heart emojis', () => {
    expect(formatOneTwentyOneLives(3)).toBe('❤️❤️❤️')
  })

  it('returns an empty string for zero lives', () => {
    expect(formatOneTwentyOneLives(0)).toBe('')
  })

  it('builds an accessible lives label', () => {
    expect(formatOneTwentyOneLivesAriaLabel(1)).toBe('1 live')
    expect(formatOneTwentyOneLivesAriaLabel(4)).toBe('4 lives')
  })
})
