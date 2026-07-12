import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('speakCallout', () => {
  const speak = vi.fn()
  const cancel = vi.fn()
  const resume = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    speak.mockClear()
    cancel.mockClear()
    resume.mockClear()

    class MockSpeechSynthesisUtterance {
      lang = ''
      rate = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(public text: string) {}
    }

    speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
      utterance.onend?.()
    })

    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak,
        cancel,
        resume,
        speaking: false,
        pending: false,
      },
      setTimeout,
      clearTimeout,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('queues phrases and starts speaking on the next tick', async () => {
    const { enqueueCallout, getCalloutQueueStateForTests } = await import('./speakCallout')

    enqueueCallout('Leg one, game on.')

    expect(speak).not.toHaveBeenCalled()

    vi.advanceTimersByTime(0)

    expect(speak).toHaveBeenCalledTimes(1)
    expect(getCalloutQueueStateForTests()).toEqual({ speaking: false, queued: 0 })
  })

  it('recovers when synthesis is idle but the local speaking flag was stuck', async () => {
    const { enqueueCallout, getCalloutQueueStateForTests } = await import('./speakCallout')

    speak.mockImplementation(() => {
      // Leave the local speaking flag stuck without firing onend.
    })

    enqueueCallout('First phrase.')
    vi.advanceTimersByTime(0)

    expect(getCalloutQueueStateForTests()).toEqual({ speaking: true, queued: 0 })

    speak.mockImplementation((utterance: { onend: (() => void) | null }) => {
      utterance.onend?.()
    })

    window.speechSynthesis.speaking = false
    window.speechSynthesis.pending = false

    enqueueCallout('Second phrase.')
    vi.advanceTimersByTime(0)

    expect(speak).toHaveBeenCalledTimes(2)
  })

  it('clears the queue and speaking flag on cancel', async () => {
    const { cancelCallouts, enqueueCallout, getCalloutQueueStateForTests } =
      await import('./speakCallout')

    speak.mockImplementation(() => {
      // Leave the local speaking flag stuck until cancel resets it.
    })

    enqueueCallout('Leg one, game on.')
    vi.advanceTimersByTime(0)

    expect(getCalloutQueueStateForTests()).toEqual({ speaking: true, queued: 0 })

    cancelCallouts()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(getCalloutQueueStateForTests()).toEqual({ speaking: false, queued: 0 })
  })
})
