import { describe, expect, it, vi, afterEach } from 'vitest'
import { formatInvitePlayerMeta } from './formatInvitePlayerMeta'

describe('formatInvitePlayerMeta', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('describes players with no shared matches', () => {
    expect(formatInvitePlayerMeta(0, null)).toBe('Not played together yet')
  })

  it('includes count and relative last-played day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T12:00:00.000Z'))

    expect(formatInvitePlayerMeta(2, '2026-11-07T12:00:00.000Z')).toBe('2 matches · last yesterday')
  })
})
