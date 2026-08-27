import { getSpeechRecognitionConstructor } from './speechRecognitionSupport'
import { voiceLog, voiceWarn } from './voiceDebug'
import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '../../types/speechRecognition'

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'paused' | 'denied' | 'failed'

export interface SpeechRecognitionControllerOptions {
  onTranscript: (transcript: string) => void
  /** Latest non-final hypothesis for the current utterance (may fire often). */
  onInterimTranscript?: (transcript: string) => void
  /**
   * Fired when a recognition session ends without a final result (or after finals).
   * Used to commit short meta commands like "undo" that Chrome often never finalizes.
   */
  onSpeechEnded?: (args: { hadFinal: boolean }) => void
  onStatus: (status: SpeechRecognitionStatus) => void
  lang?: string
  /** Minimum gap before restarting after a normal end. */
  restartDelayMs?: number
  hardFailureLimit?: number
  /** Override for tests. */
  Recognition?: SpeechRecognitionConstructor | null
}

const HARD_FAILURE_LIMIT = 5
const MIN_RESTART_MS = 150

export const createSpeechRecognitionController = (options: SpeechRecognitionControllerOptions) => {
  const Recognition =
    options.Recognition !== undefined ? options.Recognition : getSpeechRecognitionConstructor()
  const lang = options.lang ?? 'en-GB'
  const restartDelayMs = options.restartDelayMs ?? MIN_RESTART_MS
  const hardFailureLimit = options.hardFailureLimit ?? HARD_FAILURE_LIMIT

  let recognition: SpeechRecognitionLike | null = null
  let enabled = false
  let paused = false
  let stopping = false
  /** Bumped whenever we replace the recognition instance so stale events are ignored. */
  let generation = 0
  let hardFailures = 0
  let restartTimer: number | null = null
  let status: SpeechRecognitionStatus = 'idle'
  let utteranceHadFinal = false

  const setStatus = (next: SpeechRecognitionStatus): void => {
    status = next
    options.onStatus(next)
  }

  const clearRestartTimer = (): void => {
    if (restartTimer !== null) {
      globalThis.clearTimeout(restartTimer)
      restartTimer = null
    }
  }

  const scheduleRestart = (delayMs = restartDelayMs): void => {
    clearRestartTimer()

    if (!enabled || paused || stopping) {
      return
    }

    restartTimer = globalThis.setTimeout(
      () => {
        restartTimer = null
        startInternal()
      },
      Math.max(MIN_RESTART_MS, delayMs),
    )
  }

  const abortCurrent = (): void => {
    if (recognition === null) {
      return
    }

    // Detach handlers before abort so restart/stop does not re-enter onend/onerror.
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.onstart = null

    try {
      recognition.abort()
    } catch {
      // ignore
    }

    recognition = null
  }

  const attachHandlers = (instance: SpeechRecognitionLike, instanceGeneration: number): void => {
    instance.onresult = (event: SpeechRecognitionEventLike) => {
      if (instanceGeneration !== generation) {
        return
      }

      hardFailures = 0

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]

        if (result === undefined) {
          continue
        }

        if (!result.isFinal) {
          const interim = result[0]?.transcript?.trim()

          if (interim) {
            voiceLog('interim', interim)
            options.onInterimTranscript?.(interim)
          }

          continue
        }

        const alternative = result[0]

        if (alternative === undefined) {
          continue
        }

        const transcript = alternative.transcript.trim()

        if (transcript.length > 0) {
          utteranceHadFinal = true
          voiceLog('final transcript from browser', {
            transcript,
            confidence: alternative.confidence,
          })
          options.onTranscript(transcript)
        }
      }
    }

    instance.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (instanceGeneration !== generation) {
        return
      }

      const { error } = event

      // Abort is normal when replacing/pausing/stopping — never warn.
      if (error === 'aborted') {
        return
      }

      if (error === 'no-speech') {
        return
      }

      voiceWarn('recognition error', { error, message: event.message })

      if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') {
        enabled = false
        clearRestartTimer()
        setStatus(error === 'not-allowed' || error === 'service-not-allowed' ? 'denied' : 'failed')
        return
      }

      hardFailures += 1

      if (hardFailures >= hardFailureLimit) {
        enabled = false
        clearRestartTimer()
        setStatus('failed')
        voiceWarn('hard failure limit reached — stopping')
      }
    }

    instance.onend = () => {
      if (instanceGeneration !== generation) {
        return
      }

      const hadFinal = utteranceHadFinal

      if (!enabled || stopping) {
        if (!enabled && status !== 'denied' && status !== 'failed') {
          setStatus('idle')
        }

        return
      }

      if (paused) {
        setStatus('paused')
        return
      }

      options.onSpeechEnded?.({ hadFinal })

      const backoff =
        hardFailures > 0 ? Math.min(2000, 250 * 2 ** Math.max(0, hardFailures - 1)) : restartDelayMs

      scheduleRestart(backoff)
    }
  }

  const createInstance = (instanceGeneration: number): SpeechRecognitionLike | null => {
    if (Recognition === null) {
      return null
    }

    const instance = new Recognition()
    instance.lang = lang
    instance.continuous = false
    // Interims are required: finals often truncate a clearer interim phrase.
    instance.interimResults = true
    instance.maxAlternatives = 1

    if ('processLocally' in instance) {
      // Best-effort on-device; ignore failures — cloud may still work.
      try {
        instance.processLocally = true
      } catch {
        // ignore
      }
    }

    attachHandlers(instance, instanceGeneration)
    return instance
  }

  const startInternal = (): void => {
    if (!enabled || paused || stopping) {
      return
    }

    if (Recognition === null) {
      setStatus('failed')
      return
    }

    generation += 1
    const instanceGeneration = generation
    utteranceHadFinal = false
    abortCurrent()

    recognition = createInstance(instanceGeneration)

    if (recognition === null) {
      setStatus('failed')
      return
    }

    try {
      recognition.start()
      setStatus('listening')
    } catch (error) {
      voiceWarn('recognition.start() threw — retrying', error)
      scheduleRestart(restartDelayMs)
    }
  }

  const start = (): void => {
    if (Recognition === null) {
      voiceWarn('SpeechRecognition API not available')
      setStatus('failed')
      return
    }

    enabled = true
    paused = false
    stopping = false
    hardFailures = 0
    voiceLog('controller start', { lang, supported: true })
    startInternal()
  }

  const stop = (): void => {
    enabled = false
    paused = false
    stopping = true
    clearRestartTimer()
    generation += 1
    abortCurrent()
    stopping = false
    setStatus('idle')
  }

  const pause = (): void => {
    if (!enabled) {
      return
    }

    paused = true
    clearRestartTimer()
    generation += 1
    abortCurrent()
    setStatus('paused')
  }

  const resume = (extraDelayMs = 0): void => {
    if (!enabled) {
      return
    }

    paused = false
    scheduleRestart(Math.max(restartDelayMs, extraDelayMs))
  }

  const getStatus = (): SpeechRecognitionStatus => status

  const isEnabled = (): boolean => enabled

  return {
    start,
    stop,
    pause,
    resume,
    getStatus,
    isEnabled,
    isSupported: Recognition !== null,
  }
}

export type SpeechRecognitionController = ReturnType<typeof createSpeechRecognitionController>
