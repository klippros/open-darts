import { GameModeId } from '../../types/gameMode'
import { isVisitScoreVoiceMode } from './voiceModeSupport'

export interface VoicePhraseHint {
  phrase: string
  /** 0–10; higher = more likely to be recognized. */
  boost: number
}

const META_PHRASES: VoicePhraseHint[] = [
  // Keep meta boosts modest — high undo bias makes ambient noise become "undo undo…".
  { phrase: 'undo', boost: 2 },
  { phrase: 'fix', boost: 2 },
]

const BOB27_PHRASES: VoicePhraseHint[] = [
  { phrase: 'one hit', boost: 8 },
  { phrase: 'two hits', boost: 8 },
  { phrase: 'three hits', boost: 8 },
  // Prefer "no hits" — ASR recognizes it far more reliably than "missed all".
  { phrase: 'no hits', boost: 9 },
  { phrase: 'zero hits', boost: 7 },
  { phrase: 'miss all', boost: 5 },
  { phrase: 'missed all', boost: 4 },
  { phrase: 'hit one', boost: 7 },
  { phrase: 'hit two', boost: 7 },
  { phrase: 'hit three', boost: 7 },
  { phrase: 'hit 1', boost: 7 },
  { phrase: 'hit 2', boost: 7 },
  { phrase: 'hit 3', boost: 7 },
]

const AROUND_THE_CLOCK_PHRASES: VoicePhraseHint[] = [
  // Only wipe / meta phrases. Boosting bare hit/miss or specific orders makes the
  // on-device model stutter or emit a random template instead of the spoken order.
  { phrase: 'no hits', boost: 9 },
  { phrase: 'zero hits', boost: 7 },
  { phrase: 'miss all', boost: 5 },
  { phrase: 'missed all', boost: 4 },
]

/**
 * Visit-score biasing: help short scores without reintroducing "hundred" ghosts.
 * Never boost "hundred" / "a hundred" — silence often becomes that with confidence 1.
 */
const SINGLE_DIGIT_WORDS: VoicePhraseHint[] = [
  'zero',
  'oh',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
].map((phrase) => ({ phrase, boost: 6 }))

const SINGLE_DIGIT_CHARS: VoicePhraseHint[] = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
].map((phrase) => ({ phrase, boost: 4 }))

const SMALL_SCORE_WORDS: VoicePhraseHint[] = [
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
].map((phrase) => ({ phrase, boost: 3 }))

const VISIT_SCORE_PHRASES: VoicePhraseHint[] = [
  { phrase: 'no score', boost: 7 },
  { phrase: 'one eighty', boost: 5 },
  { phrase: 'nil', boost: 4 },
  { phrase: 'nought', boost: 3 },
  ...SINGLE_DIGIT_WORDS,
  ...SINGLE_DIGIT_CHARS,
  ...SMALL_SCORE_WORDS,
  ...['26', '40', '45', '60', '81', '100', '120', '140', '180'].map((phrase) => ({
    phrase,
    boost: 2,
  })),
]

const dedupePhrases = (phrases: VoicePhraseHint[]): VoicePhraseHint[] => {
  const byPhrase = new Map<string, VoicePhraseHint>()

  for (const hint of phrases) {
    const key = hint.phrase.toLowerCase()
    const existing = byPhrase.get(key)

    if (existing === undefined || hint.boost > existing.boost) {
      byPhrase.set(key, { phrase: key, boost: hint.boost })
    }
  }

  return [...byPhrase.values()]
}

/** Contextual biasing phrases for the active voice game mode. */
export const getVoiceRecognitionPhrases = (mode: GameModeId): VoicePhraseHint[] => {
  if (mode === GameModeId.Bob27) {
    return dedupePhrases([...META_PHRASES, ...BOB27_PHRASES])
  }

  if (mode === GameModeId.AroundTheClock) {
    return dedupePhrases([...META_PHRASES, ...AROUND_THE_CLOCK_PHRASES])
  }

  if (isVisitScoreVoiceMode(mode)) {
    return dedupePhrases([...META_PHRASES, ...VISIT_SCORE_PHRASES])
  }

  return dedupePhrases(META_PHRASES)
}
