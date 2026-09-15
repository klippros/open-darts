import {
  getSpeechRecognitionConstructor,
  getSpeechRecognitionPhraseConstructor,
} from './speechRecognitionSupport'
import type { VoicePhraseHint } from './speechRecognitionPhrases'
import { sanitizeVoiceTranscript } from './sanitizeVoiceTranscript'
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
  /** BCP 47 language tag. Defaults to en-US for on-device English models. */
  lang?: string
  /** Prefer on-device recognition (required for contextual phrase biasing in Chrome). */
  processLocally?: boolean
  /** Contextual biasing phrases for the active vocabulary. */
  phrases?: VoicePhraseHint[]
  /** Minimum gap before restarting after a normal end. */
  restartDelayMs?: number
  hardFailureLimit?: number
  /** Override for tests. */
  Recognition?: SpeechRecognitionConstructor | null
}

const HARD_FAILURE_LIMIT = 5
const MIN_RESTART_MS = 150
/** After silence (no-speech), wait longer before listening again — fast restart loops feed ghosts. */
const QUIET_RESTART_MS = 1600
const DEFAULT_LANG = 'en-US'

const applyRecognitionPhrases = (
  instance: SpeechRecognitionLike,
  phrases: VoicePhraseHint[],
): number => {
  if (phrases.length === 0 || !('phrases' in instance)) {
    return 0
  }

  const Phrase = getSpeechRecognitionPhraseConstructor()

  if (Phrase === null) {
    return 0
  }

  try {
    instance.phrases = phrases.map((hint) => new Phrase(hint.phrase, hint.boost))
    return phrases.length
  } catch (error) {
    voiceWarn('failed to apply recognition phrases', error)
    return 0
  }
}

export const createSpeechRecognitionController = (options: SpeechRecognitionControllerOptions) => {
  const Recognition =
    options.Recognition !== undefined ? options.Recognition : getSpeechRecognitionConstructor()
  const lang = options.lang ?? DEFAULT_LANG
  const processLocally = options.processLocally ?? true
  const phraseHints = options.phrases ?? []
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
  let phrasesEnabled = phraseHints.length > 0
  let localModelInstallStarted = false
  let noiseResetScheduled = false
  /** True after a no-speech error until the session ends — slows the next restart. */
  let endedQuietly = false
  /**
   * Once the browser has fired soundstart/speechstart at least once, require it
   * before accepting results (filters silence→phrase hallucinations).
   */
  let soundGateArmed = false
  let heardSoundThisSession = false

  const setStatus = (next: SpeechRecognitionStatus): void => {
    status = next
    options.onStatus(next)
  }

  const requestNoiseReset = (): void => {
    if (noiseResetScheduled || !enabled || paused || stopping) {
      return
    }

    noiseResetScheduled = true
    voiceLog('resetting recognition after noisy hypothesis')
    scheduleRestart(MIN_RESTART_MS)
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
    recognition.onsoundstart = null
    recognition.onspeechstart = null

    try {
      recognition.abort()
    } catch {
      // ignore
    }

    recognition = null
  }

  const ensureLocalModel = (): void => {
    if (!processLocally || localModelInstallStarted || Recognition === null) {
      return
    }

    localModelInstallStarted = true
    const install = Recognition.install

    if (typeof install !== 'function') {
      return
    }

    void (async () => {
      try {
        const installed = await install.call(Recognition, { langs: [lang], processLocally: true })
        voiceLog('local speech model install', { lang, installed })
      } catch (error) {
        voiceWarn('local speech model install failed', error)
      }
    })()
  }

  const attachHandlers = (instance: SpeechRecognitionLike, instanceGeneration: number): void => {
    const markHeardSound = (): void => {
      if (instanceGeneration !== generation) {
        return
      }

      soundGateArmed = true
      heardSoundThisSession = true
    }

    const shouldAcceptHypothesis = (): boolean => {
      if (!soundGateArmed) {
        return true
      }

      if (!heardSoundThisSession) {
        voiceLog('ignored hypothesis without sound/speech start')
        return false
      }

      return true
    }

    instance.onsoundstart = () => {
      markHeardSound()
      voiceLog('soundstart')
    }

    instance.onspeechstart = () => {
      markHeardSound()
      voiceLog('speechstart')
    }

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

          if (!interim) {
            continue
          }

          if (!shouldAcceptHypothesis()) {
            continue
          }

          const { transcript: sanitized, resetSession } = sanitizeVoiceTranscript(interim)

          if (resetSession) {
            requestNoiseReset()
          }

          if (sanitized === null) {
            voiceLog('ignored noisy interim', interim.slice(0, 120))
            continue
          }

          if (resetSession) {
            voiceLog('salvaged interim', { from: interim.slice(0, 80), to: sanitized })
          } else {
            voiceLog('interim', sanitized)
          }

          options.onInterimTranscript?.(sanitized)
          continue
        }

        const alternative = result[0]

        if (alternative === undefined) {
          continue
        }

        const transcript = alternative.transcript.trim()

        if (transcript.length === 0) {
          continue
        }

        if (!shouldAcceptHypothesis()) {
          continue
        }

        const { transcript: sanitized, resetSession } = sanitizeVoiceTranscript(transcript)

        if (resetSession) {
          requestNoiseReset()
        }

        if (sanitized === null) {
          voiceLog('ignored noisy final', transcript.slice(0, 120))
          continue
        }

        utteranceHadFinal = true
        voiceLog('final transcript from browser', {
          transcript: sanitized,
          confidence: alternative.confidence,
        })
        options.onTranscript(sanitized)
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
        endedQuietly = true
        voiceLog('no-speech (silence / too short for recognizer)')
        return
      }

      if (error === 'phrases-not-supported') {
        voiceWarn('recognition phrases not supported — retrying without phrase bias')
        phrasesEnabled = false
        scheduleRestart(restartDelayMs)
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
      const wasQuiet = endedQuietly
      endedQuietly = false

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

      const backoff = wasQuiet
        ? QUIET_RESTART_MS
        : hardFailures > 0
          ? Math.min(2000, 250 * 2 ** Math.max(0, hardFailures - 1))
          : restartDelayMs

      scheduleRestart(backoff)
    }
  }

  const createInstance = (instanceGeneration: number): SpeechRecognitionLike | null => {
    if (Recognition === null) {
      return null
    }

    const instance = new Recognition()
    instance.lang = lang
    // Continuous + interims helps short commands surface as interim/final results.
    instance.continuous = true
    instance.interimResults = true
    // Keep alternatives low for on-device performance.
    instance.maxAlternatives = 1

    if ('unspokenPunctuation' in instance) {
      try {
        instance.unspokenPunctuation = false
      } catch {
        // ignore
      }
    }

    if ('processLocally' in instance) {
      try {
        instance.processLocally = processLocally
      } catch {
        // ignore
      }
    }

    const appliedPhraseCount =
      phrasesEnabled && processLocally ? applyRecognitionPhrases(instance, phraseHints) : 0

    voiceLog('recognition instance configured', {
      lang,
      processLocally,
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      phrases: appliedPhraseCount,
    })

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
    noiseResetScheduled = false
    heardSoundThisSession = false
    endedQuietly = false
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
    phrasesEnabled = phraseHints.length > 0
    ensureLocalModel()
    voiceLog('controller start', {
      lang,
      processLocally,
      phraseHints: phraseHints.length,
      supported: true,
    })
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
