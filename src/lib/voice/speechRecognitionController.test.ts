import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { SpeechRecognitionConstructor } from '../../types/speechRecognition'
import { createSpeechRecognitionController } from './speechRecognitionController'

type Handler = ((event: unknown) => void) | null

class MockRecognition {
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  processLocally = false
  unspokenPunctuation = true
  phrases: unknown[] = []
  onresult: Handler = null
  onerror: Handler = null
  onend: Handler = null
  onstart: Handler = null
  onsoundstart: Handler = null
  onspeechstart: Handler = null
  startCount = 0
  abortCount = 0

  start = (): void => {
    this.startCount += 1
  }

  stop = (): void => undefined

  abort = (): void => {
    this.abortCount += 1
  }

  emitEnd = (): void => {
    this.onend?.(new Event('end'))
  }

  emitResult = (transcript: string): void => {
    this.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          length: 1,
          0: { transcript, confidence: 1 },
        },
      ],
    })
  }

  emitError = (error: string): void => {
    this.onerror?.({ error, message: error })
  }
}

let latest: MockRecognition | null = null

const MockRecognitionCtor = class {
  constructor() {
    latest = new MockRecognition()
    return latest
  }
} as unknown as SpeechRecognitionConstructor

describe('createSpeechRecognitionController', () => {
  beforeEach(() => {
    latest = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const create = (
    overrides: Partial<Parameters<typeof createSpeechRecognitionController>[0]> = {},
  ) =>
    createSpeechRecognitionController({
      onTranscript: vi.fn(),
      onStatus: vi.fn(),
      Recognition: MockRecognitionCtor,
      ...overrides,
    })

  it('starts and restarts on end while enabled', () => {
    const onStatus = vi.fn()
    const controller = create({ onStatus })

    controller.start()
    expect(latest?.startCount).toBe(1)
    expect(onStatus).toHaveBeenCalledWith('listening')

    const first = latest
    first?.emitEnd()
    vi.advanceTimersByTime(200)
    expect(latest).not.toBe(first)
    expect(latest?.startCount).toBe(1)
  })

  it('does not restart after stop', () => {
    const controller = create()

    controller.start()
    const instance = latest
    controller.stop()
    instance?.emitEnd()
    vi.advanceTimersByTime(500)
    expect(controller.isEnabled()).toBe(false)
  })

  it('stops on not-allowed without restarting', () => {
    const onStatus = vi.fn()
    const controller = create({ onStatus })

    controller.start()
    latest?.emitError('not-allowed')
    expect(onStatus).toHaveBeenCalledWith('denied')
    expect(controller.isEnabled()).toBe(false)
  })

  it('fails after repeated network errors', () => {
    const onStatus = vi.fn()
    const controller = create({ onStatus, hardFailureLimit: 3 })

    controller.start()

    for (let i = 0; i < 3; i += 1) {
      latest?.emitError('network')
      latest?.emitEnd()
      vi.advanceTimersByTime(3000)
    }

    expect(onStatus).toHaveBeenCalledWith('failed')
    expect(controller.isEnabled()).toBe(false)
  })

  it('delivers final transcripts', () => {
    const onTranscript = vi.fn()
    const controller = create({ onTranscript })

    controller.start()
    latest?.emitResult('  double 20 ')
    expect(onTranscript).toHaveBeenCalledWith('double 20')
  })

  it('forwards interim transcripts', () => {
    const onInterimTranscript = vi.fn()
    const controller = create({ onInterimTranscript })

    controller.start()
    expect(latest?.continuous).toBe(true)
    expect(latest?.interimResults).toBe(true)
    expect(latest?.maxAlternatives).toBe(1)
    expect(latest?.processLocally).toBe(true)
    expect(latest?.lang).toBe('en-US')

    latest?.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          length: 1,
          0: { transcript: 'Miss one double', confidence: 0.5 },
        },
      ],
    })

    expect(onInterimTranscript).toHaveBeenCalledWith('miss one double')
  })

  it('applies contextual biasing phrases when Phrase ctor is available', () => {
    class MockPhrase {
      phrase: string
      boost: number

      constructor(phrase: string, boost = 1) {
        this.phrase = phrase
        this.boost = boost
      }
    }

    Reflect.set(globalThis, 'SpeechRecognitionPhrase', MockPhrase)

    const controller = create({
      phrases: [
        { phrase: 'undo', boost: 10 },
        { phrase: 'sixty', boost: 6 },
      ],
    })

    controller.start()
    expect(latest?.phrases).toHaveLength(2)
    expect(latest?.phrases[0]).toMatchObject({ phrase: 'undo', boost: 10 })

    Reflect.deleteProperty(globalThis, 'SpeechRecognitionPhrase')
  })

  it('reports speech ended without a final', () => {
    const onSpeechEnded = vi.fn()
    const controller = create({ onSpeechEnded })

    controller.start()
    latest?.emitEnd()
    expect(onSpeechEnded).toHaveBeenCalledWith({ hadFinal: false })
  })

  it('reports speech ended after a final', () => {
    const onSpeechEnded = vi.fn()
    const controller = create({ onSpeechEnded })

    controller.start()
    latest?.emitResult('undo')
    latest?.emitEnd()
    expect(onSpeechEnded).toHaveBeenCalledWith({ hadFinal: true })
  })

  it('pauses and resumes with delay', () => {
    const onStatus = vi.fn()
    const controller = create({ onStatus })

    controller.start()
    controller.pause()
    expect(onStatus).toHaveBeenCalledWith('paused')
    const afterPause = latest
    afterPause?.emitEnd()
    vi.advanceTimersByTime(200)
    controller.resume(400)
    vi.advanceTimersByTime(399)
    const beforeResumeStart = latest
    vi.advanceTimersByTime(2)
    expect(latest).not.toBe(beforeResumeStart)
  })

  it('ignores transcripts until soundstart after the gate arms', () => {
    const onTranscript = vi.fn()
    const controller = create({ onTranscript })

    controller.start()
    latest?.onsoundstart?.(new Event('soundstart'))
    latest?.emitResult('sixty')
    expect(onTranscript).toHaveBeenCalledWith('sixty')
    onTranscript.mockClear()

    latest?.emitEnd()
    vi.advanceTimersByTime(200)

    // New session: gate is armed from prior soundstart, but this session heard none.
    latest?.emitResult('a hundred')
    expect(onTranscript).not.toHaveBeenCalled()

    latest?.onsoundstart?.(new Event('soundstart'))
    latest?.emitResult('a hundred')
    expect(onTranscript).toHaveBeenCalledWith('a hundred')
  })

  it('restarts slowly after no-speech', () => {
    const controller = create()

    controller.start()
    const first = latest
    first?.emitError('no-speech')
    first?.emitEnd()
    vi.advanceTimersByTime(1500)
    expect(latest).toBe(first)
    vi.advanceTimersByTime(200)
    expect(latest).not.toBe(first)
  })
})
