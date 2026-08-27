import { GameModeId } from '../../types/gameMode'
import type { X01InputMode } from '../../types/settings'
import type { Bob27HitCount } from '../bob27/buildBob27Darts'
import { parseAroundTheClockCommand } from './grammars/aroundTheClockGrammar'
import type { AroundTheClockCommand } from './grammars/aroundTheClockGrammar'
import { parseBob27Command } from './grammars/bob27Grammar'
import { parseVisitScoreCommand } from './grammars/visitScoreGrammar'
import { normalizeTranscriptLight } from './normalizeTranscriptLight'
import { isPathologicalVoiceHypothesis } from './sanitizeVoiceTranscript'
import { isVisitScoreVoiceMode, isVoiceInputSupportedForMode } from './voiceModeSupport'

export enum VoiceIntentKind {
  Undo = 'undo',
  Fix = 'fix',
  Bob27HitCount = 'bob27-hit-count',
  AroundTheClock = 'around-the-clock',
  VisitScore = 'visit-score',
}

export type VoiceGameplayIntent =
  | { kind: VoiceIntentKind.Bob27HitCount; hitCount: Bob27HitCount }
  | { kind: VoiceIntentKind.AroundTheClock; command: AroundTheClockCommand }
  | { kind: VoiceIntentKind.VisitScore; score: number }

export type VoiceIntent =
  | { kind: VoiceIntentKind.Undo }
  | { kind: VoiceIntentKind.Fix; inner: VoiceGameplayIntent }
  | VoiceGameplayIntent

export interface ParseVoiceCommandOptions {
  x01InputMode?: X01InputMode
}

const parseGameplayTokens = (mode: GameModeId, tokens: string[]): VoiceGameplayIntent | null => {
  if (mode === GameModeId.Bob27) {
    const hitCount = parseBob27Command(tokens)

    if (hitCount === null) {
      return null
    }

    return { kind: VoiceIntentKind.Bob27HitCount, hitCount }
  }

  if (mode === GameModeId.AroundTheClock) {
    const command = parseAroundTheClockCommand(tokens)

    if (command === null) {
      return null
    }

    return { kind: VoiceIntentKind.AroundTheClock, command }
  }

  if (isVisitScoreVoiceMode(mode)) {
    const score = parseVisitScoreCommand(tokens)

    if (score === null) {
      return null
    }

    return { kind: VoiceIntentKind.VisitScore, score }
  }

  return null
}

/**
 * Parse a transcript into a strict voice intent for the active game mode.
 * Returns null when the transcript is not an exact complete command, or when
 * voice input is not supported for the mode.
 */
export const parseVoiceCommand = (
  mode: GameModeId,
  transcript: string,
  options: ParseVoiceCommandOptions = {},
): VoiceIntent | null => {
  if (!isVoiceInputSupportedForMode(mode, options)) {
    return null
  }

  const lightTokens = normalizeTranscriptLight(transcript)

  if (lightTokens.length === 0 || isPathologicalVoiceHypothesis(lightTokens)) {
    return null
  }

  if (lightTokens[0] === 'undo') {
    if (lightTokens.length === 1) {
      return { kind: VoiceIntentKind.Undo }
    }

    const inner = parseGameplayTokens(mode, lightTokens.slice(1))

    if (inner === null) {
      return null
    }

    return { kind: VoiceIntentKind.Fix, inner }
  }

  return parseGameplayTokens(mode, lightTokens)
}
