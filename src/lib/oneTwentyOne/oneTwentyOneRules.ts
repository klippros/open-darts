import type { DartThrow } from '../../types/dart'
import type { OneTwentyOneConfig } from '../../types/oneTwentyOne'
import { resolveX01Visit } from '../x01/x01Rules'
import { toOneTwentyOneX01Config } from './oneTwentyOneConfig'

const MIN_ROUND_TARGET = 2

export interface OneTwentyOneRoundContext {
  roundTarget: number
  remaining: number
  visitsOnTarget: number
  lives: number
  peakTarget: number
}

export interface OneTwentyOneRoundOutcome {
  roundTargetAfter: number
  remainingAfter: number
  visitsOnTargetAfter: number
  livesAfter: number
  peakTargetAfter: number
  bust: boolean
  checkout: boolean
  roundFailed: boolean
  lifeGained: boolean
  lifeLost: boolean
}

export const resolveOneTwentyOneRoundVisit = (
  context: OneTwentyOneRoundContext,
  darts: DartThrow[],
  config: OneTwentyOneConfig,
): OneTwentyOneRoundOutcome => {
  const { roundTarget, remaining, visitsOnTarget, lives, peakTarget } = context
  const outcome = resolveX01Visit(remaining, darts, toOneTwentyOneX01Config(config), true)
  const isFirstVisitOnTarget = visitsOnTarget === 0

  if (outcome.checkout) {
    const roundTargetAfter = roundTarget + config.increment

    return {
      roundTargetAfter,
      remainingAfter: roundTargetAfter,
      visitsOnTargetAfter: 0,
      livesAfter: isFirstVisitOnTarget ? lives + 1 : lives,
      peakTargetAfter: Math.max(peakTarget, roundTargetAfter),
      bust: false,
      checkout: true,
      roundFailed: false,
      lifeGained: isFirstVisitOnTarget,
      lifeLost: false,
    }
  }

  const visitsAfterThisVisit = visitsOnTarget + 1

  if (visitsAfterThisVisit >= config.maxVisitsPerTarget) {
    const roundTargetAfter = Math.max(MIN_ROUND_TARGET, roundTarget - config.increment)

    return {
      roundTargetAfter,
      remainingAfter: roundTargetAfter,
      visitsOnTargetAfter: 0,
      livesAfter: lives - 1,
      peakTargetAfter: peakTarget,
      bust: outcome.bust,
      checkout: false,
      roundFailed: true,
      lifeGained: false,
      lifeLost: true,
    }
  }

  return {
    roundTargetAfter: roundTarget,
    remainingAfter: outcome.scoreAfter,
    visitsOnTargetAfter: visitsAfterThisVisit,
    livesAfter: lives,
    peakTargetAfter: peakTarget,
    bust: outcome.bust,
    checkout: false,
    roundFailed: false,
    lifeGained: false,
    lifeLost: false,
  }
}
