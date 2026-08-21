import { GameModeId } from '../../types/gameMode'
import type { Bob27HitCount } from '../bob27/buildBob27Darts'
import {
  parseAroundTheClockCommand,
  type AroundTheClockCommand,
} from './grammars/aroundTheClockGrammar'
import { parseBob27Command } from './grammars/bob27Grammar'
import { normalizeTranscriptLight } from './normalizeTranscriptLight'
import { isVoiceInputSupportedForMode } from './voiceModeSupport'

export enum VoiceIntentKind {
  Undo = 'undo',
  Fix = 'fix',
  Bob27HitCount = 'bob27-hit-count',
  AroundTheClock = 'around-the-clock',
}

export type VoiceGameplayIntent =
  | { kind: VoiceIntentKind.Bob27HitCount; hitCount: Bob27HitCount }
  | { kind: VoiceIntentKind.AroundTheClock; command: AroundTheClockCommand }

export type VoiceIntent =
  | { kind: VoiceIntentKind.Undo }
  | { kind: VoiceIntentKind.Fix; inner: VoiceGameplayIntent }
  | VoiceGameplayIntent

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

  return null
}

/**
 * Parse a transcript into a strict voice intent for the active game mode.
 * Returns null when the transcript is not an exact complete command, or when
 * voice input is not supported for the mode.
 */
export const parseVoiceCommand = (mode: GameModeId, transcript: string): VoiceIntent | null => {
  if (!isVoiceInputSupportedForMode(mode)) {
    return null
  }

  const lightTokens = normalizeTranscriptLight(transcript)

  if (lightTokens.length === 0) {
    return null
  }

  if (lightTokens.length === 1 && lightTokens[0] === 'undo') {
    return { kind: VoiceIntentKind.Undo }
  }

  if (lightTokens[0] === 'fix') {
    if (lightTokens.length < 2) {
      return null
    }

    const inner = parseGameplayTokens(mode, lightTokens.slice(1))

    if (inner === null) {
      return null
    }

    return { kind: VoiceIntentKind.Fix, inner }
  }

  return parseGameplayTokens(mode, lightTokens)
}
