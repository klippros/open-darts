import { normalizeTranscriptLight } from './normalizeTranscriptLight'

/** Longest legitimate voice command we accept (e.g. "one hundred and forty"). */
export const MAX_VOICE_COMMAND_TOKENS = 5

/** Continuous sessions longer than this with low diversity are treated as noise. */
const PATHOLOGICAL_MIN_LENGTH = 8

/** Known short commands that continuous ASR often stutters ("no hits" × N). */
const SALVAGE_PHRASE_CANDIDATES: readonly string[][] = [
  ['no', 'score'],
  ['one', 'eighty'],
  ['no', 'hits'],
  ['zero', 'hits'],
  ['missed', 'all'],
  ['miss', 'all'],
  ['two', 'hits'],
  ['three', 'hits'],
  ['one', 'hit'],
  ['hit', 'one'],
  ['hit', 'two'],
  ['hit', 'three'],
  ['hit', '1'],
  ['hit', '2'],
  ['hit', '3'],
]

const isHitOrMiss = (token: string): boolean => token === 'hit' || token === 'miss'

const countOccurrences = (tokens: string[], token: string): number =>
  tokens.reduce((count, current) => (current === token ? count + 1 : count), 0)

const tokensEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((token, index) => token === right[index])

const countNonOverlappingPhrase = (tokens: string[], phrase: string[]): number => {
  let count = 0
  let index = 0

  while (index <= tokens.length - phrase.length) {
    if (tokensEqual(tokens.slice(index, index + phrase.length), phrase)) {
      count += 1
      index += phrase.length
      continue
    }

    index += 1
  }

  return count
}

/**
 * True when a hypothesis looks like continuous-recognition stutter / digit thrash
 * rather than a deliberate command.
 */
export const isPathologicalVoiceHypothesis = (tokens: string[]): boolean => {
  if (tokens.length === 0) {
    return true
  }

  const first = tokens[0]
  const allSame = first !== undefined && tokens.every((token) => token === first)

  if (allSame) {
    // Exact ATC sequences like "miss miss miss" are length 3 — keep those.
    if (first === 'undo') {
      return tokens.length >= 2
    }

    return tokens.length > 3
  }

  // Around-the-clock visit is at most 3 hit/miss tokens; anything longer is stutter.
  if (tokens.length > 3 && tokens.every(isHitOrMiss)) {
    return true
  }

  if (tokens.length <= MAX_VOICE_COMMAND_TOKENS) {
    return false
  }

  const uniqueCount = new Set(tokens).size

  if (tokens.length >= PATHOLOGICAL_MIN_LENGTH && uniqueCount <= 6) {
    return true
  }

  return tokens.length > 10
}

const salvageTrailingCommand = (tokens: string[]): string | null => {
  // Hit/miss overrun: do not invent an order — keep the last clean interim instead.
  if (tokens.length > 3 && tokens.every(isHitOrMiss)) {
    return null
  }

  // Prefer a phrase that was clearly stuttered (appears 2+ times), even if the
  // stream is truncated mid-word at the end.
  let bestPhrase: string[] | null = null
  let bestCount = 0

  for (const phrase of SALVAGE_PHRASE_CANDIDATES) {
    const count = countNonOverlappingPhrase(tokens, phrase)

    if (count > bestCount) {
      bestCount = count
      bestPhrase = phrase
    }
  }

  if (bestPhrase !== null && bestCount >= 2) {
    return bestPhrase.join(' ')
  }

  for (const phrase of SALVAGE_PHRASE_CANDIDATES) {
    if (tokens.length < phrase.length) {
      continue
    }

    const trailing = tokens.slice(-phrase.length)

    if (tokensEqual(trailing, phrase)) {
      return phrase.join(' ')
    }
  }

  const last = tokens.at(-1)

  if (last === undefined) {
    return null
  }

  // Multi-digit totals at the end are usually the intended score after digit thrash.
  if (/^\d{2,3}$/u.test(last)) {
    return last
  }

  // A longer word that barely appears in the noise stream.
  if (last.length >= 3 && countOccurrences(tokens, last) <= 2) {
    return last
  }

  return null
}

export interface SanitizedVoiceTranscript {
  transcript: string | null
  /** Continuous buffer should be flushed — hypothesis was pathological noise. */
  resetSession: boolean
}

/**
 * Clean a continuous-session hypothesis into a short command string, or null.
 * Pathological streams may still salvage a trailing multi-digit score / phrase.
 */
export const sanitizeVoiceTranscript = (transcript: string): SanitizedVoiceTranscript => {
  const tokens = normalizeTranscriptLight(transcript)

  if (tokens.length === 0) {
    return { transcript: null, resetSession: false }
  }

  if (!isPathologicalVoiceHypothesis(tokens)) {
    return { transcript: tokens.join(' '), resetSession: false }
  }

  return {
    transcript: salvageTrailingCommand(tokens),
    resetSession: true,
  }
}
