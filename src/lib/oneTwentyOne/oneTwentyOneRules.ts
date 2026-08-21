import type { DartThrow } from '../../types/dart'
import type { OneTwentyOneConfig } from '../../types/oneTwentyOne'
import type { X01VisitOutcome } from '../x01/x01Rules'
import { resolveX01Visit, resolveX01VisitScore } from '../x01/x01Rules'
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

const applyOneTwentyOneRoundOutcome = (
  context: OneTwentyOneRoundContext,
  outcome: X01VisitOutcome,
  config: OneTwentyOneConfig,
): OneTwentyOneRoundOutcome => {
  const { roundTarget, visitsOnTarget, lives, peakTarget } = context
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

export const resolveOneTwentyOneRoundVisit = (
  context: OneTwentyOneRoundContext,
  darts: DartThrow[],
  config: OneTwentyOneConfig,
): OneTwentyOneRoundOutcome => {
  const outcome = resolveX01Visit(context.remaining, darts, toOneTwentyOneX01Config(config), true)

  return applyOneTwentyOneRoundOutcome(context, outcome, config)
}

export const resolveOneTwentyOneRoundVisitScore = (
  context: OneTwentyOneRoundContext,
  claimedScore: number,
  config: OneTwentyOneConfig,
): OneTwentyOneRoundOutcome => {
  const outcome = resolveX01VisitScore(
    context.remaining,
    claimedScore,
    toOneTwentyOneX01Config(config),
    true,
  )

  return applyOneTwentyOneRoundOutcome(context, outcome, config)
}
