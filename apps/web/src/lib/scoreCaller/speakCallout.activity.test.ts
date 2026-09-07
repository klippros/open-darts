import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  CALLOUT_ECHO_HOLD_MS,
  cancelCallouts,
  enqueueCallout,
  getCalloutActivityForTests,
  getCalloutQueueStateForTests,
  resetCalloutQueueForTests,
  subscribeCalloutActivity,
} from './speakCallout'

describe('subscribeCalloutActivity', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetCalloutQueueForTests()
  })

  afterEach(() => {
    resetCalloutQueueForTests()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('notifies when callouts are enqueued and cancelled', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeCalloutActivity(listener)

    expect(listener).toHaveBeenCalledWith(false)
    listener.mockClear()

    enqueueCallout(null)
    expect(listener).not.toHaveBeenCalled()

    cancelCallouts()
    unsubscribe()
  })

  it('holds activity through the echo window after speech ends', () => {
    const synthesis = {
      speaking: false,
      pending: false,
      resume: vi.fn(),
      cancel: vi.fn(),
      speak: vi.fn(),
    }

    class FakeUtterance {
      lang = ''
      rate = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public text: string) {}
    }

    vi.stubGlobal('speechSynthesis', synthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('window', {
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: FakeUtterance,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    })

    const listener = vi.fn()
    const unsubscribe = subscribeCalloutActivity(listener)
    listener.mockClear()

    enqueueCallout('one hundred and eighty')
    vi.advanceTimersByTime(0)

    expect(synthesis.speak).toHaveBeenCalledOnce()
    const utterance = synthesis.speak.mock.calls[0]?.[0] as {
      onend: (() => void) | null
    }
    utterance.onend?.()

    expect(getCalloutQueueStateForTests().echoHolding).toBe(true)
    expect(getCalloutActivityForTests()).toBe(true)

    vi.advanceTimersByTime(CALLOUT_ECHO_HOLD_MS)
    expect(getCalloutQueueStateForTests().echoHolding).toBe(false)
    expect(getCalloutActivityForTests()).toBe(false)
    expect(listener).toHaveBeenCalledWith(false)

    unsubscribe()
  })

  it('unsubscribes cleanly', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeCalloutActivity(listener)
    unsubscribe()
    listener.mockClear()
    cancelCallouts()
    expect(listener).not.toHaveBeenCalled()
  })
})
