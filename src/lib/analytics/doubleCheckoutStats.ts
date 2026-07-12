import type { CheckoutRules } from '../../types/checkout'
import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'
import type { Visit } from '../../types/visit'
import { isDoubleDart } from '../dartScoring'
import { formatDart } from '../formatDart'
import type { CheckoutDart } from '../checkout/checkoutSuggestions'
import { isCheckoutPossible, suggestCheckoutPath } from '../checkout/checkoutSuggestions'

export interface DoubleCheckoutStats {
  attempts: number
  successes: number
}

export const emptyDoubleCheckoutStats = (): DoubleCheckoutStats => ({
  attempts: 0,
  successes: 0,
})

export const mergeDoubleCheckoutStats = (
  left: DoubleCheckoutStats,
  right: DoubleCheckoutStats,
): DoubleCheckoutStats => ({
  attempts: left.attempts + right.attempts,
  successes: left.successes + right.successes,
})

const isFinishingCheckoutPath = (path: CheckoutDart[]): boolean => {
  if (path.length !== 1) {
    return false
  }

  const { label } = path[0]!

  return label.startsWith('D') || label === 'Bull'
}

const countsTowardScore = (dart: DartThrow, doubleIn: boolean, hasOpened: boolean): boolean => {
  if (dart.points === 0) {
    return false
  }

  if (!doubleIn || hasOpened) {
    return true
  }

  return isDoubleDart(dart)
}

const isDoubleAttemptOnFinish = (dart: DartThrow, target: CheckoutDart): boolean => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return true
  }

  const { label } = target

  if (label === 'Bull') {
    return (
      dart.segment.type === DartSegmentType.Bull || dart.segment.type === DartSegmentType.OuterBull
    )
  }

  if (label.startsWith('D')) {
    const segmentValue = Number(label.slice(1))

    if (dart.segment.type === DartSegmentType.Number && dart.segment.value === segmentValue) {
      return true
    }
  }

  return dart.multiplier === DartMultiplier.Double
}

const isSuccessfulFinish = (
  dart: DartThrow,
  target: CheckoutDart,
  remaining: number,
  rules: CheckoutRules,
): boolean => {
  if (formatDart(dart) !== target.label) {
    return false
  }

  if (remaining - dart.points !== 0) {
    return false
  }

  if (rules.doubleOut && !isDoubleDart(dart)) {
    return false
  }

  return true
}

const applyDartToRemaining = (
  remaining: number,
  dart: DartThrow,
  rules: CheckoutRules,
): { remaining: number; bust: boolean; checkout: boolean } => {
  const nextRemaining = remaining - dart.points

  if (nextRemaining < 0) {
    return { remaining, bust: true, checkout: false }
  }

  if (nextRemaining === 1 && rules.doubleOut) {
    return { remaining, bust: true, checkout: false }
  }

  if (nextRemaining === 0) {
    if (rules.doubleOut && !isDoubleDart(dart)) {
      return { remaining, bust: true, checkout: false }
    }

    return { remaining: 0, bust: false, checkout: true }
  }

  return { remaining: nextRemaining, bust: false, checkout: false }
}

export const countDoubleCheckoutStatsForVisit = (
  visit: Visit,
  rules: CheckoutRules,
  doubleIn: boolean,
  hasOpenedBefore: boolean,
): { stats: DoubleCheckoutStats; hasOpenedAfter: boolean } => {
  let remaining = visit.scoreBefore
  let opened = hasOpenedBefore
  const stats = emptyDoubleCheckoutStats()

  for (let dartIndex = 0; dartIndex < visit.darts.length; dartIndex += 1) {
    const dart = visit.darts[dartIndex]!

    if (remaining <= 0) {
      break
    }

    const dartsRemaining = 3 - dartIndex
    const scoringDart = countsTowardScore(dart, doubleIn, opened)

    if (isCheckoutPossible(remaining, rules)) {
      const path = suggestCheckoutPath(remaining, dartsRemaining, rules)

      if (path !== null && isFinishingCheckoutPath(path)) {
        const target = path[0]!

        if (isDoubleAttemptOnFinish(dart, target)) {
          stats.attempts += 1

          if (scoringDart && isSuccessfulFinish(dart, target, remaining, rules)) {
            stats.successes += 1
          }
        }
      }
    }

    if (!scoringDart) {
      continue
    }

    if (!opened && doubleIn) {
      opened = true
    }

    const outcome = applyDartToRemaining(remaining, dart, rules)

    if (outcome.bust || outcome.checkout) {
      break
    }

    remaining = outcome.remaining
  }

  return { stats, hasOpenedAfter: opened }
}

const computeHasOpenedBeforeVisit = (priorVisits: Visit[], doubleIn: boolean): boolean => {
  if (!doubleIn) {
    return true
  }

  let opened = false

  for (const visit of priorVisits) {
    for (const dart of visit.darts) {
      if (countsTowardScore(dart, doubleIn, opened)) {
        if (!opened) {
          opened = true
        }
      }
    }
  }

  return opened
}

export const countDoubleCheckoutStats = (
  visits: Visit[],
  rules: CheckoutRules,
  doubleIn = false,
): DoubleCheckoutStats =>
  visits.reduce<DoubleCheckoutStats>((totals, visit, index) => {
    const hasOpenedBefore = computeHasOpenedBeforeVisit(visits.slice(0, index), doubleIn)
    const { stats } = countDoubleCheckoutStatsForVisit(visit, rules, doubleIn, hasOpenedBefore)

    return mergeDoubleCheckoutStats(totals, stats)
  }, emptyDoubleCheckoutStats())
