import { isMissedAllPhrase } from './missedAllPhrase'

export type TenUpOneDownVoiceOutcome = 'miss' | 'checkout'

const isMissPhrase = (tokens: string[]): boolean => {
  if (tokens.length === 1) {
    const token = tokens[0]
    return (
      token === 'failed' ||
      token === 'fail' ||
      token === 'miss' ||
      token === 'missed' ||
      token === 'nil' ||
      token === 'nought' ||
      token === 'zero' ||
      token === 'noscore'
    )
  }

  if (tokens.length === 2 && tokens[0] === 'no' && tokens[1] === 'score') {
    return true
  }

  return isMissedAllPhrase(tokens)
}

/**
 * Closed 10 Up 1 Down grammar: fail the target, or call checkout.
 * Prefer "failed" — longer than bare "miss" and more reliable for ASR.
 */
export const parseTenUpOneDownCommand = (tokens: string[]): TenUpOneDownVoiceOutcome | null => {
  if (isMissPhrase(tokens)) {
    return 'miss'
  }

  if (
    tokens.length === 1 &&
    (tokens[0] === 'checkout' || tokens[0] === 'check' || tokens[0] === 'success')
  ) {
    return 'checkout'
  }

  if (tokens.length === 2 && tokens[0] === 'game' && tokens[1] === 'shot') {
    return 'checkout'
  }

  return null
}
