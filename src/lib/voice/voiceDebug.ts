import { GameModeId } from '../../types/gameMode'
import { normalizeTranscriptLight } from './normalizeTranscriptLight'
import type { VoiceIntent } from './parseVoiceCommand'
import { getVoiceCommandHelpLines } from './voiceCommandHelp'

const PREFIX = '[voice]'

export const voiceLog = (...args: unknown[]): void => {
  if (!import.meta.env.DEV) {
    return
  }

  console.info(PREFIX, ...args)
}

export const voiceWarn = (...args: unknown[]): void => {
  if (!import.meta.env.DEV) {
    return
  }

  console.warn(PREFIX, ...args)
}

export const logVoiceSessionStart = (mode: GameModeId, isolationMs: number): void => {
  voiceLog('listening started', {
    mode,
    isolationMs,
    commands: getVoiceCommandHelpLines(mode),
  })
}

export const logVoiceTranscriptPipeline = (args: {
  mode: GameModeId
  transcript: string
  intent: VoiceIntent | null
  isolationOutcome: string
  inputDisabled: boolean
}): void => {
  voiceLog('transcript', {
    raw: args.transcript,
    lightTokens: normalizeTranscriptLight(args.transcript),
    parsed: args.intent,
    isolation: args.isolationOutcome,
    inputDisabled: args.inputDisabled,
  })
}
