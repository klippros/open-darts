import { isMissedAllPhrase } from './missedAllPhrase'

export type AroundTheClockOutcome = 'hit' | 'miss'

export type AroundTheClockCommand =
  { type: 'sequence'; outcomes: AroundTheClockOutcome[] } | { type: 'missed-all' }

/**
 * Around the Clock grammar:
 * - `hit` / `miss` sequences naming each dart in order (must fill the visit)
 * - `no hits` (and aliases) for the rest of the visit
 *
 * Hit counts ("two hits") are rejected — they do not say which darts scored.
 */
export const parseAroundTheClockCommand = (tokens: string[]): AroundTheClockCommand | null => {
  if (isMissedAllPhrase(tokens)) {
    return { type: 'missed-all' }
  }

  if (tokens.length < 1 || tokens.length > 3) {
    return null
  }

  const outcomes: AroundTheClockOutcome[] = []

  for (const token of tokens) {
    if (token === 'hit') {
      outcomes.push('hit')
      continue
    }

    if (token === 'miss') {
      outcomes.push('miss')
      continue
    }

    return null
  }

  return { type: 'sequence', outcomes }
}
