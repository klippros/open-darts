import { useEffect, useRef } from 'react'
import type { AppGameController } from '../lib/game/createSession'
import { subscribeCalloutActivity } from '../lib/scoreCaller/speakCallout'
import {
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
import {
  logVoiceSessionStart,
  logVoiceTranscriptPipeline,
  voiceLog,
  voiceWarn,
} from '../lib/voice/voiceDebug'
import { createVoiceUndoHistory } from '../lib/voice/voiceUndoHistory'
import { isVoiceInputSupportedForMode } from '../lib/voice/voiceModeSupport'
import type { GameModeId } from '../types/gameMode'
import { useSettings } from './settingsContext'
import { useUiSounds } from './useUiSounds'
import { useVoiceControl } from './voiceControlContext'

export interface UseVoiceRecognitionOptions {
  mode: GameModeId
  sessionId: string
  inputDisabled: boolean
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
  applyControllerTransaction,
}: UseVoiceRecognitionOptions): void => {
  const { enabled, setEnabled, setStatus } = useVoiceControl()
  const { voiceIsolationMs } = useSettings()
  const { playHit, playMiss } = useUiSounds()
  const modeSupportsVoice = isVoiceInputSupportedForMode(mode)

  const historyRef = useRef(createVoiceUndoHistory())
  const isolationRef = useRef<CommandIsolationState>(createCommandIsolationState())
  const recognitionRef = useRef<SpeechRecognitionController | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const pendingTranscriptRef = useRef<string | null>(null)
  const bestInterimRef = useRef<string | null>(null)
  const isolationMsRef = useRef(voiceIsolationMs)
  const modeRef = useRef(mode)
  const applyRef = useRef(applyControllerTransaction)
  const playHitRef = useRef(playHit)
  const playMissRef = useRef(playMiss)
  const inputDisabledRef = useRef(inputDisabled)
  const calloutActiveRef = useRef(false)
  const interimUndoTimerRef = useRef<number | null>(null)
  const undoCommittedFromInterimRef = useRef(false)
  const handleTranscriptRef = useRef<(transcript: string) => void>(() => undefined)

  isolationMsRef.current = voiceIsolationMs
  modeRef.current = mode
  applyRef.current = applyControllerTransaction
  playHitRef.current = playHit
  playMissRef.current = playMiss
  inputDisabledRef.current = inputDisabled

  const clearHoldTimer = (): void => {
    if (holdTimerRef.current !== null) {
      globalThis.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }

    pendingTranscriptRef.current = null
  }

  const clearInterimUndoTimer = (): void => {
    if (interimUndoTimerRef.current !== null) {
      globalThis.clearTimeout(interimUndoTimerRef.current)
      interimUndoTimerRef.current = null
    }
  }

  /** Chrome often never finalizes short "undo" — commit from a stable interim. */
  const INTERIM_UNDO_DEBOUNCE_MS = 280

  const tryCommitUndoFromInterim = (transcript: string, reason: string): boolean => {
    if (undoCommittedFromInterimRef.current || calloutActiveRef.current) {
      return false
    }

    const intent = parseVoiceCommand(modeRef.current, transcript)

    if (intent?.kind !== VoiceIntentKind.Undo) {
      return false
    }

    undoCommittedFromInterimRef.current = true
    clearInterimUndoTimer()
    voiceLog('committing undo from interim', { transcript, reason })
    handleTranscriptRef.current(transcript)
    return true
  }

  const scheduleInterimUndoCommit = (transcript: string): void => {
    clearInterimUndoTimer()
    interimUndoTimerRef.current = globalThis.setTimeout(() => {
      interimUndoTimerRef.current = null
      tryCommitUndoFromInterim(transcript, 'debounce')
    }, INTERIM_UNDO_DEBOUNCE_MS)
  }

  const commitTranscript = (transcript: string): void => {
    const intent = parseVoiceCommand(modeRef.current, transcript)

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
          playback: 'hit' | 'miss' | null
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

        if (computed.playback === 'hit') {
          playHitRef.current()
        } else if (computed.playback === 'miss') {
          playMissRef.current()
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

    const intent = parseVoiceCommand(modeRef.current, transcript)

    // After the match ends, only voice undo remains (same as keyboard undo).
    if (inputDisabledRef.current && intent?.kind !== VoiceIntentKind.Undo) {
      voiceWarn('transcript ignored — input disabled', { transcript })
      return
    }

    const isValid = intent !== null
    const now = Date.now()

    // undo/fix: cancel any pending isolation hold and apply immediately.
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

    const { state, outcome } = commandIsolationOnTranscript(
      isolationRef.current,
      now,
      isolationMsRef.current,
      isValid,
    )
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
          isolationMs: isolationMsRef.current,
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
      clearHoldTimer()
      pendingTranscriptRef.current = transcript
      holdTimerRef.current = globalThis.setTimeout(() => {
        holdTimerRef.current = null
        const pending = pendingTranscriptRef.current
        pendingTranscriptRef.current = null

        if (pending === null) {
          return
        }

        const timerResult = commandIsolationOnTimer(
          isolationRef.current,
          Date.now(),
          isolationMsRef.current,
        )
        isolationRef.current = timerResult.state

        voiceLog('isolation timer fired', {
          pending,
          outcome: timerResult.outcome.type,
        })

        if (timerResult.outcome.type === 'execute') {
          commitTranscript(pending)
        }
      }, outcome.delayMs)
    }
  }

  handleTranscriptRef.current = handleTranscript

  useEffect(() => {
    historyRef.current.clear()
    isolationRef.current = createCommandIsolationState()
    clearHoldTimer()
    clearInterimUndoTimer()
    bestInterimRef.current = null
    undoCommittedFromInterimRef.current = false
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
      clearInterimUndoTimer()
      isolationRef.current = createCommandIsolationState()
      calloutActiveRef.current = false
      undoCommittedFromInterimRef.current = false
      setStatus('idle')
      return undefined
    }

    let cancelled = false

    const controller = createSpeechRecognitionController({
      onInterimTranscript: (transcript) => {
        bestInterimRef.current = transcript

        if (calloutActiveRef.current || undoCommittedFromInterimRef.current) {
          return
        }

        const intent = parseVoiceCommand(modeRef.current, transcript)

        if (intent?.kind === VoiceIntentKind.Undo) {
          scheduleInterimUndoCommit(transcript)
          return
        }

        clearInterimUndoTimer()
      },
      onSpeechEnded: ({ hadFinal }) => {
        if (cancelled || hadFinal || undoCommittedFromInterimRef.current) {
          if (hadFinal) {
            undoCommittedFromInterimRef.current = false
          }

          return
        }

        const interim = bestInterimRef.current

        if (interim !== null) {
          tryCommitUndoFromInterim(interim, 'speech-ended')
        }
      },
      onTranscript: (finalTranscript) => {
        clearInterimUndoTimer()

        const interimTranscript = bestInterimRef.current
        bestInterimRef.current = null

        const transcript = chooseSpeechTranscript(
          modeRef.current,
          finalTranscript,
          interimTranscript,
        )

        if (transcript !== finalTranscript) {
          voiceLog('preferring interim over truncated final', {
            final: finalTranscript,
            interim: interimTranscript,
            chosen: transcript,
          })
        }

        if (undoCommittedFromInterimRef.current) {
          const intent = parseVoiceCommand(modeRef.current, transcript)

          if (intent?.kind === VoiceIntentKind.Undo) {
            voiceLog('skipping final undo — already committed from interim', {
              transcript,
            })
            undoCommittedFromInterimRef.current = false
            return
          }

          undoCommittedFromInterimRef.current = false
        }

        handleTranscriptRef.current(transcript)
      },
      onStatus: (status: SpeechRecognitionStatus) => {
        if (cancelled) {
          return
        }

        if (status === 'listening') {
          undoCommittedFromInterimRef.current = false
        }

        setStatus(status)

        if (status === 'denied' || status === 'failed') {
          setEnabled(false)
        }
      },
    })

    recognitionRef.current = controller
    logVoiceSessionStart(modeRef.current, isolationMsRef.current)
    controller.start()

    const unsubscribeCallout = subscribeCalloutActivity((active) => {
      if (cancelled || !controller.isEnabled()) {
        return
      }

      calloutActiveRef.current = active

      if (active) {
        bestInterimRef.current = null
        clearHoldTimer()
        clearInterimUndoTimer()
        voiceLog('pausing for score caller TTS')
        controller.pause()
        return
      }

      voiceLog('resuming after score caller', { isolationMs: isolationMsRef.current })
      controller.resume(isolationMsRef.current)
    })

    return () => {
      cancelled = true
      voiceLog('listening stopped')
      unsubscribeCallout()
      clearHoldTimer()
      clearInterimUndoTimer()
      bestInterimRef.current = null
      undoCommittedFromInterimRef.current = false
      calloutActiveRef.current = false
      controller.stop()
      recognitionRef.current = null
      isolationRef.current = createCommandIsolationState()
    }
  }, [enabled, modeSupportsVoice, setStatus, setEnabled])
}
