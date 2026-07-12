import type { DartThrow } from '../../types/dart'
import type { CheckoutRules } from '../../types/checkout'
import { formatDart } from '../formatDart'
import {
  findFallbackCheckoutPath,
  getSingleDartFinish,
  labelsToCheckoutPath,
} from './checkoutFallback'
import type { CheckoutDart } from './checkoutDart'
import { DOUBLE_OUT_BOGEY_SCORES, getPdcCheckoutLabels } from './pdcCheckoutTable'

export { checkoutDartFromLabel } from './checkoutDart'
export type { CheckoutDart } from './checkoutDart'

export const MAX_CHECKOUT_SCORE = 170

const isDoubleOutBogeyScore = (remaining: number, rules: CheckoutRules): boolean =>
  rules.doubleOut && DOUBLE_OUT_BOGEY_SCORES.has(remaining)

const getPdcCheckoutPath = (remaining: number, dartsRemaining: number): CheckoutDart[] | null => {
  const labels = getPdcCheckoutLabels(remaining)

  if (labels === null || labels.length > dartsRemaining) {
    return null
  }

  return labelsToCheckoutPath(labels)
}

export const isCheckoutPossible = (remaining: number, rules: CheckoutRules): boolean => {
  if (remaining > MAX_CHECKOUT_SCORE || remaining < 2) {
    return false
  }

  if (rules.doubleOut && remaining === 1) {
    return false
  }

  if (isDoubleOutBogeyScore(remaining, rules)) {
    return false
  }

  if (getSingleDartFinish(remaining, rules) !== null) {
    return true
  }

  if (rules.doubleOut && getPdcCheckoutLabels(remaining) !== null) {
    return true
  }

  return findFallbackCheckoutPath(remaining, 3, rules) !== null
}

export const isInCheckoutRange = (remaining: number, rules: CheckoutRules): boolean =>
  isCheckoutPossible(remaining, rules)

export interface NormalizeCheckoutTargetOptions {
  minScore?: number
  prefer?: 'up' | 'down'
}

const findNearestCheckoutTarget = (
  from: number,
  rules: CheckoutRules,
  minScore: number,
  direction: 'up' | 'down',
): number | null => {
  if (direction === 'up') {
    for (let candidate = from + 1; candidate <= MAX_CHECKOUT_SCORE; candidate += 1) {
      if (isCheckoutPossible(candidate, rules)) {
        return candidate
      }
    }

    for (let candidate = from - 1; candidate >= minScore; candidate -= 1) {
      if (isCheckoutPossible(candidate, rules)) {
        return candidate
      }
    }

    return null
  }

  for (let candidate = from - 1; candidate >= minScore; candidate -= 1) {
    if (isCheckoutPossible(candidate, rules)) {
      return candidate
    }
  }

  for (let candidate = from + 1; candidate <= MAX_CHECKOUT_SCORE; candidate += 1) {
    if (isCheckoutPossible(candidate, rules)) {
      return candidate
    }
  }

  return null
}

export const normalizeCheckoutTarget = (
  score: number,
  rules: CheckoutRules,
  options: NormalizeCheckoutTargetOptions = {},
): number => {
  const minScore = options.minScore ?? 2
  const prefer = options.prefer ?? 'up'

  if (score <= minScore) {
    return minScore
  }

  const clamped = Math.min(MAX_CHECKOUT_SCORE, Math.max(minScore, score))

  if (isCheckoutPossible(clamped, rules)) {
    return clamped
  }

  return findNearestCheckoutTarget(clamped, rules, minScore, prefer) ?? clamped
}

export const isBogeyCheckoutScore = (remaining: number, rules: CheckoutRules): boolean =>
  remaining >= 2 && remaining <= MAX_CHECKOUT_SCORE && !isCheckoutPossible(remaining, rules)

export const suggestCheckoutPath = (
  remaining: number,
  dartsRemaining: number,
  rules: CheckoutRules,
): CheckoutDart[] | null => {
  if (remaining > MAX_CHECKOUT_SCORE || remaining < 2 || (rules.doubleOut && remaining === 1)) {
    return null
  }

  if (isDoubleOutBogeyScore(remaining, rules)) {
    return null
  }

  const singleDartFinish = getSingleDartFinish(remaining, rules)

  if (singleDartFinish !== null && dartsRemaining >= 1) {
    return [singleDartFinish]
  }

  if (rules.doubleOut) {
    for (let dartCount = Math.min(dartsRemaining, 3); dartCount >= 1; dartCount -= 1) {
      const pdcPath = getPdcCheckoutPath(remaining, dartCount)

      if (pdcPath !== null) {
        return pdcPath
      }
    }
  }

  for (let dartCount = 1; dartCount <= dartsRemaining; dartCount += 1) {
    const fallbackPath = findFallbackCheckoutPath(remaining, dartCount, rules)

    if (fallbackPath !== null) {
      return fallbackPath
    }
  }

  return null
}

export interface VisitDartSlotView {
  kind: 'thrown' | 'suggested' | 'empty'
  label: string | null
}

export const getVisitDartSlots = (
  scoreBeforeVisit: number,
  pendingDarts: DartThrow[],
  rules: CheckoutRules,
): VisitDartSlotView[] => {
  const thrownPoints = pendingDarts.reduce((total, dart) => total + dart.points, 0)
  const remaining = scoreBeforeVisit - thrownPoints
  const dartsRemaining = 3 - pendingDarts.length
  const checkoutPath = suggestCheckoutPath(remaining, dartsRemaining, rules) ?? []
  const slots: VisitDartSlotView[] = []
  let suggestionIndex = 0

  for (let index = 0; index < 3; index += 1) {
    const thrown = pendingDarts[index]

    if (thrown !== undefined) {
      slots.push({
        kind: 'thrown',
        label: formatDart(thrown),
      })
      continue
    }

    const suggestedDart = checkoutPath[suggestionIndex]

    if (suggestedDart === undefined) {
      slots.push({ kind: 'empty', label: null })
      continue
    }

    suggestionIndex += 1
    slots.push({
      kind: 'suggested',
      label: suggestedDart.label,
    })
  }

  return slots
}
