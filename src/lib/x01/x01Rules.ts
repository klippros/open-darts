import type { DartThrow } from '../../types/dart'
import type { X01Config } from '../../types/x01'
import { isDoubleDart, sumDartPoints } from '../dartScoring'

export interface X01VisitOutcome {
  scoreAfter: number
  bust: boolean
  checkout: boolean
  opened: boolean
}

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
