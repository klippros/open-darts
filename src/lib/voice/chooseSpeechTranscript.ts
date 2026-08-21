import type { GameModeId } from '../../types/gameMode'
import { normalizeTranscriptLight } from './normalizeTranscriptLight'
import { parseVoiceCommand, VoiceIntentKind } from './parseVoiceCommand'
import type { ParseVoiceCommandOptions, VoiceIntent } from './parseVoiceCommand'

const intentFingerprint = (intent: VoiceIntent): string => {
  switch (intent.kind) {
    case VoiceIntentKind.Undo:
      return 'undo'
    case VoiceIntentKind.Fix:
      return `fix:${intentFingerprint(intent.inner)}`
    case VoiceIntentKind.Bob27HitCount:
      return `bob27:${intent.hitCount}`
    case VoiceIntentKind.AroundTheClock:
      return intent.command.type === 'missed-all'
        ? 'atc:missed-all'
        : `atc:${intent.command.outcomes.join(',')}`
    case VoiceIntentKind.VisitScore:
      return `visit-score:${intent.score}`
    default: {
      const _exhaustive: never = intent
      return _exhaustive
    }
  }
}

/**
 * True when the browser finalized a proper prefix of a richer interim
 * (e.g. interim "Hit two", final "Hit").
 */
export const looksLikeTruncatedFinal = (
  interimTranscript: string,
  finalTranscript: string,
): boolean => {
  const interimTokens = normalizeTranscriptLight(interimTranscript)
  const finalTokens = normalizeTranscriptLight(finalTranscript)

  if (finalTokens.length === 0 || finalTokens.length >= interimTokens.length) {
    return false
  }

  return finalTokens.every((token, index) => token === interimTokens[index])
}

/**
 * Prefer a richer interim hypothesis when the browser truncates the utterance
 * (e.g. "Hit two" → "Hit").
 */
export const chooseSpeechTranscript = (
  mode: GameModeId,
  finalTranscript: string,
  interimTranscript: string | null | undefined,
  options: ParseVoiceCommandOptions = {},
): string => {
  const finalText = finalTranscript.trim()
  const interimText = interimTranscript?.trim() ?? ''

  if (interimText.length === 0) {
    return finalText
  }

  const finalIntent = parseVoiceCommand(mode, finalText, options)
  const interimIntent = parseVoiceCommand(mode, interimText, options)

  // Meta commands from the final hypothesis always win.
  if (finalIntent?.kind === VoiceIntentKind.Undo || finalIntent?.kind === VoiceIntentKind.Fix) {
    return finalText
  }

  if (looksLikeTruncatedFinal(interimText, finalText) && interimIntent !== null) {
    return interimText
  }

  if (interimIntent === null) {
    return finalText
  }

  if (finalIntent === null) {
    return interimText
  }

  if (intentFingerprint(finalIntent) === intentFingerprint(interimIntent)) {
    return finalText
  }

  return finalText
}
