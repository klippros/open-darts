/**
 * Shared zero-hit / wipe visit phrasing for Bob's 27 and Around the Clock.
 * Prefer "no hits" — ASR recognizes it more reliably than "missed all".
 */
export const isMissedAllPhrase = (tokens: string[]): boolean => {
  if (tokens.length !== 2) {
    return false
  }

  const [first, second] = tokens

  if (first === undefined || second === undefined) {
    return false
  }

  if (first === 'no' && second === 'hits') {
    return true
  }

  if (first === 'zero' && second === 'hits') {
    return true
  }

  if ((first === 'missed' || first === 'miss') && second === 'all') {
    return true
  }

  return false
}
