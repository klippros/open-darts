import type { Bob27HitCount } from '../../bob27/buildBob27Darts'
import { isMissedAllPhrase } from './missedAllPhrase'

const HIT_COUNTS: Record<string, Bob27HitCount> = {
  '1': 1,
  one: 1,
  '2': 2,
  two: 2,
  '3': 3,
  three: 3,
}

/**
 * Closed Bob's 27 grammar. Preferred spoken forms: `one hit`, `two hits`, `three hits`,
 * `no hits`. Also accepts `hit 1|2|3` / number words and miss-all aliases.
 */
export const parseBob27Command = (tokens: string[]): Bob27HitCount | null => {
  if (
    isMissedAllPhrase(tokens) ||
    (tokens.length === 1 && (tokens[0] === 'nil' || tokens[0] === 'nought'))
  ) {
    return 0
  }

  if (tokens.length === 2 && tokens[1] === 'hits') {
    const count = tokens[0] === undefined ? undefined : HIT_COUNTS[tokens[0]]
    return count !== undefined && count > 1 ? count : null
  }

  if (tokens.length === 2 && tokens[1] === 'hit') {
    const count = tokens[0] === undefined ? undefined : HIT_COUNTS[tokens[0]]
    return count === 1 ? 1 : null
  }

  if (tokens.length === 2 && tokens[0] === 'hit') {
    const count = tokens[1] === undefined ? undefined : HIT_COUNTS[tokens[1]]
    return count ?? null
  }

  return null
}
