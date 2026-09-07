import { describe, expect, it } from 'vitest'
import { shouldSkipMatchIndexSync } from '../src/match/indexSync'

describe('match index sync', () => {
  it('skips writes against the test supabase url', () => {
    expect(shouldSkipMatchIndexSync('http://example.invalid')).toBe(true)
    expect(shouldSkipMatchIndexSync('')).toBe(true)
    expect(shouldSkipMatchIndexSync('http://127.0.0.1:54321')).toBe(false)
  })
})
