import { useEffect, useRef } from 'react'
import type { AppGameController } from '../lib/game/createSession'
import { subscribeCalloutActivity } from '../lib/scoreCaller/speakCallout'
import {
  VOICE_CALLER_RESUME_MS,
  VOICE_COMMAND_ISOLATION_MS,
  commandIsolationOnTimer,
  commandIsolationOnTranscript,
  createCommandIsolationState,
} from '../lib/voice/commandIsolation'
import type { CommandIsolationState } from '../lib/voice/commandIsolation'
import { chooseSpeechTranscript } from '../lib/voice/chooseSpeechTranscript'
import { executeVoiceCommand } from '../lib/voice/executeVoiceCommand'
import { parseVoiceCommand, VoiceIntentKind } from '../lib/voice/parseVoiceCommand'
import { createSpeechRecognitionController } from '../lib/voice/speechRecognitionController'
import type {
  SpeechRecognitionController,
  SpeechRecognitionStatus,
} from '../lib/voice/speechRecognitionController'
import { getVoiceRecognitionPhrases } from '../lib/voice/speechRecognitionPhrases'
import {
  logVoiceSessionStart,
  logVoiceTranscriptPipeline,
  voiceLog,
  voiceWarn,
} from '../lib/voice/voiceDebug'
import { createVoiceUndoHistory } from '../lib/voice/voiceUndoHistory'
import { isVoiceInputSupportedForMode } from '../lib/voice/voiceModeSupport'
import { shouldSupersedePendingVisitScore } from '../lib/voice/shouldSupersedePendingVisitScore'
import type { GameModeId } from '../types/gameMode'
import type { X01InputMode } from '../types/settings'
import { useUiSounds } from './useUiSounds'
import { useVoiceControl } from './voiceControlContext'

export interface UseVoiceRecognitionOptions {
  mode: GameModeId
  sessionId: string
  inputDisabled: boolean
  x01InputMode?: X01InputMode
  applyControllerTransaction: (
    updater: (current: AppGameController) => {
      next: AppGameController
      scoreCallerBase?: AppGameController
      didUndo?: boolean
    } | null,
  ) => void
}

export const useVoiceRecognition = ({
  mode,
  sessionId,
  inputDisabled,
  x01InputMode,
  applyControllerTransaction,
}: UseVoiceRecognitionOptions): void => {
  const { enabled, setEnabled, setStatus } = useVoiceControl()
  const { playUndo, playSequence } = useUiSounds()
  const modeSupportsVoice = isVoiceInputSupportedForMode(mode, { x01InputMode })

  const historyRef = useRef(createVoiceUndoHistory())
  const isolationRef = useRef<CommandIsolationState>(createCommandIsolationState())
  const recognitionRef = useRef<SpeechRecognitionController | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const pendingTranscriptRef = useRef<string | null>(null)
  const bestInterimRef = useRef<string | null>(null)
  const modeRef = useRef(mode)
  const x01InputModeRef = useRef(x01InputMode)
  const applyRef = useRef(applyControllerTransaction)
  const playUndoRef = useRef(playUndo)
  const playSequenceRef = useRef(playSequence)
  const inputDisabledRef = useRef(inputDisabled)
  const calloutActiveRef = useRef(false)
  const interimCommitTimerRef = useRef<number | null>(null)
  const interimCommittedRef = useRef(false)
  const handleTranscriptRef = useRef<(transcript: string) => void>(() => undefined)

  modeRef.current = mode
  x01InputModeRef.current = x01InputMode
  applyRef.current = applyControllerTransaction
  playUndoRef.current = playUndo
  playSequenceRef.current = playSequence
  inputDisabledRef.current = inputDisabled

  const clearHoldTimer = (): void => {
    if (holdTimerRef.current !== null) {
      globalThis.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    pendingTranscriptRef.current = null
  }

  const clearInterimCommitTimer = (): void => {
    if (interimCommitTimerRef.current !== null) {
      globalThis.clearTimeout(interimCommitTimerRef.current)
      interimCommitTimerRef.current = null
    }
  }

  /**
   * Chrome often never finalizes short commands ("six", "two hits", "no hits").
   * Commit stable gameplay interims — not undo (noise easily looks like undo).
   * Around the Clock wipe phrases can interim-commit; hit/miss sequences wait for
   * speech-ended so an early wrong 3-dart guess is not locked in mid-utterance.
   */
  const INTERIM_COMMIT_DEBOUNCE_MS = 450
  /** Short digit scores often grow ("4" → "411") — wait longer before locking in. */
  const VISIT_SCORE_GROWING_DEBOUNCE_MS = 800

  const isInterimCommitEligible = (
    intent: ReturnType<typeof parseVoiceCommand>,
  ): intent is NonNullable<ReturnType<typeof parseVoiceCommand>> => {
    if (intent === null) {
      return false
    }

    if (
      intent.kind === VoiceIntentKind.VisitScore ||
      intent.kind === VoiceIntentKind.Bob27HitCount
    ) {
      return true
    }

    // Wipe only — sequence orders must settle via speech-ended / final.
    return intent.kind === VoiceIntentKind.AroundTheClock && intent.command.type === 'missed-all'
  }

  const isAroundTheClockSequenceCommitEligible = (
    intent: ReturnType<typeof parseVoiceCommand>,
  ): boolean =>
    intent?.kind === VoiceIntentKind.AroundTheClock &&
    intent.command.type === 'sequence' &&
    intent.command.outcomes.length >= 1 &&
    intent.command.outcomes.length <= 3

  const visitScoreInterimDelayMs = (transcript: string): number => {
    const compact = transcript.replace(/\s+/gu, '')

    if (/^\d{1,2}$/u.test(compact)) {
      return VISIT_SCORE_GROWING_DEBOUNCE_MS
    }

    return INTERIM_COMMIT_DEBOUNCE_MS
  }

  const armIsolationHold = (transcript: string, delayMs: number): void => {
    clearHoldTimer()
    const now = Date.now()
    isolationRef.current = {
      lastSpeechAt: now,
      pending: true,
      pendingSince: now,
    }
    pendingTranscriptRef.current = transcript
    holdTimerRef.current = globalThis.setTimeout(() => {
      holdTimerRef.current = null
      const pending = pendingTranscriptRef.current
      pendingTranscriptRef.current = null

      if (pending === null) {
        return
      }

      const timerResult = commandIsolationOnTimer(isolationRef.current, Date.now())
      isolationRef.current = timerResult.state

      voiceLog('isolation timer fired', {
        pending,
        outcome: timerResult.outcome.type,
      })

      if (timerResult.outcome.type === 'execute') {
        commitTranscript(pending)
      }
    }, delayMs)
  }

  const trySupersedePendingVisitScore = (transcript: string): boolean => {
    const pending = pendingTranscriptRef.current

    if (pending === null || !shouldSupersedePendingVisitScore(pending, transcript)) {
      return false
    }

    const intent = parseVoiceCommand(modeRef.current, transcript, {
      x01InputMode: x01InputModeRef.current,
    })

    if (intent?.kind !== VoiceIntentKind.VisitScore) {
      return false
    }

    voiceLog('isolation hold superseded by longer visit score', { from: pending, to: transcript })
    armIsolationHold(transcript, VOICE_COMMAND_ISOLATION_MS)
    return true
  }

  const tryCommitFromInterim = (transcript: string, reason: string): boolean => {
    if (interimCommittedRef.current || calloutActiveRef.current) {
      return false
    }

    const intent = parseVoiceCommand(modeRef.current, transcript, {
      x01InputMode: x01InputModeRef.current,
    })

    const eligible =
      isInterimCommitEligible(intent) ||
      (reason === 'speech-ended' && isAroundTheClockSequenceCommitEligible(intent))

    if (!eligible) {
      return false
    }

    interimCommittedRef.current = true
    clearInterimCommitTimer()
    voiceLog('committing from interim', { transcript, reason, intent })
    handleTranscriptRef.current(transcript)
    return true
  }

  const scheduleInterimCommit = (transcript: string): void => {
    clearInterimCommitTimer()
    const delayMs = visitScoreInterimDelayMs(transcript)
    interimCommitTimerRef.current = globalThis.setTimeout(() => {
      interimCommitTimerRef.current = null
      tryCommitFromInterim(transcript, 'debounce')
    }, delayMs)
  }

  const commitTranscript = (transcript: string): void => {
    const intent = parseVoiceCommand(modeRef.current, transcript, {
      x01InputMode: x01InputModeRef.current,
    })

    if (intent === null) {
      voiceWarn('commit skipped — parse returned null', { transcript })
      return
    }

    // React Strict Mode can invoke the setState updater twice; compute once and
    // run voice side effects once for that same `next` reference.
    let computed:
      | {
          next: AppGameController
          scoreCallerBase: AppGameController
          didUndo: boolean
          playback: ('hit' | 'miss')[] | null
          commitHistory: (history: ReturnType<typeof createVoiceUndoHistory>) => void
        }
      | null
      | undefined
    let voiceEffectsFor: AppGameController | null = null

    applyRef.current((current) => {
      if (computed === undefined) {
        const result = executeVoiceCommand(current, intent, historyRef.current)

        if (result === null) {
          computed = null
          voiceWarn('execute rejected (dry-run / undo eligibility)', {
            transcript,
            intent,
            visits: current.session.visits.length,
            pending: current.pendingDarts.length,
            voiceHistorySize: historyRef.current.size(),
          })
          return null
        }

        computed = {
          next: result.next,
          scoreCallerBase: result.scoreCallerBase,
          didUndo: result.didUndo,
          playback: result.playback,
          commitHistory: result.commitHistory,
        }
      }

      if (computed === null) {
        return null
      }

      if (voiceEffectsFor !== computed.next) {
        voiceEffectsFor = computed.next

        voiceLog('executed', {
          transcript,
          intent,
          playback: computed.playback,
          didUndo: computed.didUndo,
          visitsAfter: computed.next.session.visits.length,
          pendingAfter: computed.next.pendingDarts.length,
        })

        computed.commitHistory(historyRef.current)

        if (computed.didUndo && computed.playback === null) {
          playUndoRef.current()
        } else if (computed.playback !== null && computed.playback.length > 0) {
          playSequenceRef.current(computed.playback)
        }
      }

      return {
        next: computed.next,
        scoreCallerBase: computed.scoreCallerBase,
        didUndo: computed.didUndo,
      }
    })
  }

  const isMetaIntent = (intent: ReturnType<typeof parseVoiceCommand>): boolean =>
    intent?.kind === VoiceIntentKind.Undo || intent?.kind === VoiceIntentKind.Fix

  const handleTranscript = (transcript: string): void => {
    // Mic is paused during callouts; still drop anything that races through.
    if (calloutActiveRef.current) {
      voiceLog('suppressed during score caller', { transcript })
      bestInterimRef.current = null
      return
    }

    const intent = parseVoiceCommand(modeRef.current, transcript, {
      x01InputMode: x01InputModeRef.current,
    })

    // After the match ends, only voice undo remains (same as keyboard undo).
    if (inputDisabledRef.current && intent?.kind !== VoiceIntentKind.Undo) {
      voiceWarn('transcript ignored — input disabled', { transcript })
      return
    }

    const isValid = intent !== null
    const now = Date.now()

    // Meta commands: cancel any pending isolation hold and apply immediately.
    if (isMetaIntent(intent)) {
      clearHoldTimer()
      isolationRef.current = {
        lastSpeechAt: now,
        pending: false,
        pendingSince: null,
      }

      logVoiceTranscriptPipeline({
        mode: modeRef.current,
        transcript,
        intent,
        isolationOutcome: 'execute',
        inputDisabled: inputDisabledRef.current,
      })

      commitTranscript(transcript)
      return
    }

    const { state, outcome } = commandIsolationOnTranscript(isolationRef.current, now, isValid)
    isolationRef.current = state

    logVoiceTranscriptPipeline({
      mode: modeRef.current,
      transcript,
      intent,
      isolationOutcome: outcome.type,
      inputDisabled: inputDisabledRef.current,
    })

    if (outcome.type === 'cancel-hold') {
      voiceWarn('isolation cancelled pending hold (extra speech)', { transcript })
      clearHoldTimer()
      return
    }

    if (outcome.type === 'reject' || !isValid) {
      if (!isValid) {
        voiceWarn('no matching command for mode', {
          mode: modeRef.current,
          transcript,
        })
      } else {
        voiceWarn('isolation rejected (pre-gap)', {
          transcript,
          isolationMs: VOICE_COMMAND_ISOLATION_MS,
        })
      }

      clearHoldTimer()
      return
    }

    if (outcome.type === 'execute') {
      clearHoldTimer()
      commitTranscript(transcript)
      return
    }

    if (outcome.type === 'hold') {
      voiceLog('isolation hold — waiting for post-gap silence', {
        transcript,
        delayMs: outcome.delayMs,
      })
      armIsolationHold(transcript, outcome.delayMs)
    }
  }

  handleTranscriptRef.current = handleTranscript

  useEffect(() => {
    historyRef.current.clear()
    isolationRef.current = createCommandIsolationState()
    clearHoldTimer()
    clearInterimCommitTimer()
    bestInterimRef.current = null
    interimCommittedRef.current = false
    setEnabled(false)
  }, [sessionId, setEnabled])

  useEffect(() => {
    if (!modeSupportsVoice && enabled) {
      setEnabled(false)
    }
  }, [modeSupportsVoice, enabled, setEnabled])

  useEffect(() => {
    if (!enabled || !modeSupportsVoice) {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      clearHoldTimer()
      clearInterimCommitTimer()
      isolationRef.current = createCommandIsolationState()
      calloutActiveRef.current = false
      interimCommittedRef.current = false
      setStatus('idle')
      return undefined
    }

    let cancelled = false

    const controller = createSpeechRecognitionController({
      lang: 'en-US',
      processLocally: true,
      phrases: getVoiceRecognitionPhrases(modeRef.current),
      onInterimTranscript: (transcript) => {
        bestInterimRef.current = transcript

        if (calloutActiveRef.current) {
          return
        }

        // ASR often streams "4" then "411" — replace a pending short score before it executes.
        if (trySupersedePendingVisitScore(transcript)) {
          return
        }

        if (interimCommittedRef.current) {
          return
        }

        const intent = parseVoiceCommand(modeRef.current, transcript, {
          x01InputMode: x01InputModeRef.current,
        })

        if (isInterimCommitEligible(intent)) {
          scheduleInterimCommit(transcript)
        }
        // Do not clear a pending interim commit on unrelated/noisy interims —
        // recognition reset after salvage often emits junk that would cancel it.
      },
      onSpeechEnded: ({ hadFinal }) => {
        if (cancelled || hadFinal || interimCommittedRef.current) {
          if (hadFinal) {
            interimCommittedRef.current = false
          }

          return
        }

        const interim = bestInterimRef.current

        if (interim !== null) {
          tryCommitFromInterim(interim, 'speech-ended')
        }
      },
      onTranscript: (finalTranscript) => {
        clearInterimCommitTimer()

        const interimTranscript = bestInterimRef.current
        bestInterimRef.current = null

        const transcript = chooseSpeechTranscript(
          modeRef.current,
          finalTranscript,
          interimTranscript,
          { x01InputMode: x01InputModeRef.current },
        )

        if (transcript !== finalTranscript) {
          voiceLog('preferring interim over truncated final', {
            final: finalTranscript,
            interim: interimTranscript,
            chosen: transcript,
          })
        }

        if (interimCommittedRef.current) {
          const intent = parseVoiceCommand(modeRef.current, transcript, {
            x01InputMode: x01InputModeRef.current,
          })

          if (isInterimCommitEligible(intent)) {
            voiceLog('skipping final — already committed from interim', {
              transcript,
              intent,
            })
            interimCommittedRef.current = false
            return
          }

          interimCommittedRef.current = false
        }

        handleTranscriptRef.current(transcript)
      },
      onStatus: (status: SpeechRecognitionStatus) => {
        if (cancelled) {
          return
        }

        if (status === 'listening') {
          interimCommittedRef.current = false
        }

        setStatus(status)

        if (status === 'denied' || status === 'failed') {
          setEnabled(false)
        }
      },
    })

    recognitionRef.current = controller
    logVoiceSessionStart(modeRef.current)
    controller.start()

    const unsubscribeCallout = subscribeCalloutActivity((active) => {
      if (cancelled || !controller.isEnabled()) {
        return
      }

      calloutActiveRef.current = active

      if (active) {
        bestInterimRef.current = null
        clearHoldTimer()
        clearInterimCommitTimer()
        voiceLog('pausing for score caller TTS')
        controller.pause()
        return
      }

      voiceLog('resuming after score caller', { isolationMs: VOICE_CALLER_RESUME_MS })
      controller.resume(VOICE_CALLER_RESUME_MS)
    })

    return () => {
      cancelled = true
      voiceLog('listening stopped')
      unsubscribeCallout()
      clearHoldTimer()
      clearInterimCommitTimer()
      bestInterimRef.current = null
      interimCommittedRef.current = false
      calloutActiveRef.current = false
      controller.stop()
      recognitionRef.current = null
      isolationRef.current = createCommandIsolationState()
    }
  }, [enabled, modeSupportsVoice, setStatus, setEnabled])
}
