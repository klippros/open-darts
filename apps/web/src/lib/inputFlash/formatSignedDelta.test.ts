import { describe, expect, it } from 'vitest'
import { formatSignedDelta } from './formatSignedDelta'

describe('formatSignedDelta', () => {
  it('formats positive, negative, and zero values', () => {
    expect(formatSignedDelta(40)).toBe('+40')
    expect(formatSignedDelta(-40)).toBe('-40')
    expect(formatSignedDelta(0)).toBe('+0')
    expect(formatSignedDelta(9)).toBe('+9')
  })
})
