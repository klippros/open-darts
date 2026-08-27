import type { DartThrow } from '../../types/dart'
import type { X01Config } from '../../types/x01'
import { isDoubleDart, sumDartPoints } from '../dartScoring'

export const MIN_VISIT_SCORE = 0
export const MAX_VISIT_SCORE = 180

export interface X01VisitOutcome {
  scoreAfter: number
  bust: boolean
  checkout: boolean
  opened: boolean
}

export const isValidVisitScore = (score: number): boolean =>
  Number.isInteger(score) && score >= MIN_VISIT_SCORE && score <= MAX_VISIT_SCORE

const countsTowardScore = (dart: DartThrow, config: X01Config, hasOpened: boolean): boolean => {
  if (dart.points === 0) {
    return false
  }

  if (!config.doubleIn || hasOpened) {
    return true
  }

  return isDoubleDart(dart)
}

export const resolveX01Visit = (
  scoreBefore: number,
  darts: DartThrow[],
  config: X01Config,
  hasOpened: boolean,
): X01VisitOutcome => {
  let remaining = scoreBefore
  let opened = hasOpened
  let bust = false
  let checkout = false

  for (const dart of darts) {
    if (!countsTowardScore(dart, config, opened)) {
      continue
    }

    if (!opened && config.doubleIn) {
      opened = true
    }

    const nextRemaining = remaining - dart.points

    if (nextRemaining < 0) {
      bust = true
      break
    }

    if (nextRemaining === 1 && config.doubleOut) {
      bust = true
      break
    }

    if (nextRemaining === 0) {
      if (config.doubleOut && !isDoubleDart(dart)) {
        bust = true
        break
      }

      checkout = true
      remaining = 0
      break
    }

    remaining = nextRemaining
  }

  return {
    scoreAfter: bust ? scoreBefore : remaining,
    bust,
    checkout,
    opened,
  }
}

export const previewX01Remaining = (
  scoreBefore: number,
  darts: DartThrow[],
  config: X01Config,
  hasOpened: boolean,
): number => resolveX01Visit(scoreBefore, darts, config, hasOpened).scoreAfter

export const getX01VisitScore = (darts: DartThrow[]): number => sumDartPoints(darts)

/**
 * Resolve a visit from a claimed three-dart total.
 * Trusts the caller that the score obeyed game rules (e.g. double-out finish).
 */
export const resolveX01VisitScore = (
  scoreBefore: number,
  claimedScore: number,
  config: X01Config,
  hasOpened: boolean,
): X01VisitOutcome => {
  if (claimedScore > scoreBefore) {
    return {
      scoreAfter: scoreBefore,
      bust: true,
      checkout: false,
      opened: hasOpened,
    }
  }

  const nextRemaining = scoreBefore - claimedScore

  if (nextRemaining === 1 && config.doubleOut) {
    return {
      scoreAfter: scoreBefore,
      bust: true,
      checkout: false,
      opened: hasOpened,
    }
  }

  if (nextRemaining === 0) {
    return {
      scoreAfter: 0,
      bust: false,
      checkout: true,
      opened: hasOpened || claimedScore > 0,
    }
  }

  return {
    scoreAfter: nextRemaining,
    bust: false,
    checkout: false,
    opened: hasOpened || claimedScore > 0,
  }
}
