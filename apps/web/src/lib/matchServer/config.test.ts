import { describe, expect, it } from 'vitest'
import { resolveOnlineMatchesEnabled } from './config'

describe('resolveOnlineMatchesEnabled', () => {
  it('requires both Supabase and the match server', () => {
    expect(resolveOnlineMatchesEnabled(false, false)).toBe(false)
    expect(resolveOnlineMatchesEnabled(true, false)).toBe(false)
    expect(resolveOnlineMatchesEnabled(false, true)).toBe(false)
    expect(resolveOnlineMatchesEnabled(true, true)).toBe(true)
  })
})
