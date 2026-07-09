import type { DartThrow } from '../../types/dart'
import type { OneTwentyOneConfig } from '../../types/oneTwentyOne'
import type { X01Config } from '../../types/x01'
import { resolveX01Visit } from '../x01/x01Rules'

const toX01Config = (config: OneTwentyOneConfig): X01Config => ({
  startScore: config.startScore,
  doubleIn: false,
  doubleOut: config.doubleOut,
})

export interface OneTwentyOneVisitOutcome {
  targetScoreAfter: number
  bust: boolean
  checkout: boolean
}

export const resolveOneTwentyOneVisit = (
  targetScore: number,
  darts: DartThrow[],
  config: OneTwentyOneConfig,
): OneTwentyOneVisitOutcome => {
  const outcome = resolveX01Visit(targetScore, darts, toX01Config(config), true)

  if (outcome.checkout) {
    return {
      targetScoreAfter: targetScore + config.increment,
      bust: false,
      checkout: true,
    }
  }

  if (outcome.bust) {
    return {
      targetScoreAfter: config.startScore,
      bust: true,
      checkout: false,
    }
  }

  return {
    targetScoreAfter: targetScore,
    bust: false,
    checkout: false,
  }
}
