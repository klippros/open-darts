import { NinetyNineDartsOutcome } from '@open-darts/game/types/ninetyNineDarts'

const OUTCOME_TOKENS: Record<string, NinetyNineDartsOutcome> = {
  miss: NinetyNineDartsOutcome.Miss,
  missed: NinetyNineDartsOutcome.Miss,
  single: NinetyNineDartsOutcome.Single,
  double: NinetyNineDartsOutcome.Double,
  treble: NinetyNineDartsOutcome.Triple,
  triple: NinetyNineDartsOutcome.Triple,
}

/**
 * Closed 99 Darts grammar. Preferred forms: `miss`, `single`, `double`, `treble`.
 * Accepts one or more outcomes for the remaining darts in the visit.
 */
export const parseNinetyNineDartsCommand = (tokens: string[]): NinetyNineDartsOutcome[] | null => {
  if (tokens.length === 0 || tokens.length > 3) {
    return null
  }

  const outcomes: NinetyNineDartsOutcome[] = []

  for (const token of tokens) {
    const outcome = OUTCOME_TOKENS[token]

    if (outcome === undefined) {
      return null
    }

    outcomes.push(outcome)
  }

  return outcomes
}
