import { describe, expect, it, vi } from 'vitest'
import {
  announceCalloutOnce,
  legStartCalloutKey,
  resetAnnouncedCalloutsForTests,
} from './announceCallout'

const enqueueCallout = vi.fn<(phrase: string | null) => void>()

vi.mock('./speakCallout', () => ({
  enqueueCallout: (phrase: string | null) => {
    enqueueCallout(phrase)
  },
  cancelCallouts: vi.fn(),
  resetCalloutQueueForTests: vi.fn(),
}))

describe('announceCallout', () => {
  it('announces each key only once', () => {
    resetAnnouncedCalloutsForTests()
    enqueueCallout.mockClear()

    const key = legStartCalloutKey('session-1', 1)

    announceCalloutOnce(key, 'Leg one, game on.')
    announceCalloutOnce(key, 'Leg one, game on.')

    expect(enqueueCallout).toHaveBeenCalledTimes(1)
    expect(enqueueCallout).toHaveBeenCalledWith('Leg one, game on.')
  })
})
