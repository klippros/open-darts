import type { CheckoutRules } from '../../types/checkout'
import type { CheckoutDart } from './checkoutDart'
import { checkoutDartFromLabel } from './checkoutDart'

const DOUBLE_FINISH_SEGMENT_PREFERENCE_ORDER = [
  20, 10, 5, 16, 8, 4, 2, 12, 6, 3, 18, 14, 15, 17, 19, 1,
] as const

const WEDGE_SEGMENT_PREFERENCE_ORDER = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
] as const

const isDoubleOutFinishDart = (dart: CheckoutDart): boolean =>
  dart.label === 'Bull' || dart.label.startsWith('D')

const getFinishDartOptionsInPreferenceOrder = (): CheckoutDart[] => {
  const options: CheckoutDart[] = [{ label: 'Bull', points: 50 }]

  for (const segment of DOUBLE_FINISH_SEGMENT_PREFERENCE_ORDER) {
    options.push({ label: `D${segment}`, points: segment * 2 })
  }

  return options
}

const getAllDartOptions = (): CheckoutDart[] => {
  const options: CheckoutDart[] = [
    { label: 'Bull', points: 50 },
    { label: '25', points: 25 },
  ]

  for (let value = 20; value >= 1; value -= 1) {
    options.push({ label: `T${value}`, points: value * 3 })
    options.push({ label: `D${value}`, points: value * 2 })
    options.push({ label: String(value), points: value })
  }

  return options
}

const getFallbackSetupDartOptionsInPreferenceOrder = (): CheckoutDart[] => {
  const seen = new Set<string>()
  const options: CheckoutDart[] = []

  const addOption = (dart: CheckoutDart) => {
    if (seen.has(dart.label)) {
      return
    }

    seen.add(dart.label)
    options.push(dart)
  }

  addOption({ label: '25', points: 25 })

  for (const segment of WEDGE_SEGMENT_PREFERENCE_ORDER) {
    addOption({ label: String(segment), points: segment })
  }

  for (const segment of WEDGE_SEGMENT_PREFERENCE_ORDER) {
    addOption({ label: `T${segment}`, points: segment * 3 })
  }

  for (const dart of getAllDartOptions()) {
    addOption(dart)
  }

  return options
}

const isValidFinalDart = (dart: CheckoutDart, remaining: number, rules: CheckoutRules): boolean => {
  if (dart.points !== remaining) {
    return false
  }

  if (!rules.doubleOut) {
    return true
  }

  return isDoubleOutFinishDart(dart)
}

export const getSingleDartFinish = (
  remaining: number,
  rules: CheckoutRules,
): CheckoutDart | null => {
  const finishOptions = rules.doubleOut
    ? getFinishDartOptionsInPreferenceOrder()
    : getAllDartOptions()

  for (const dart of finishOptions) {
    if (isValidFinalDart(dart, remaining, rules)) {
      return dart
    }
  }

  return null
}

export const findFallbackCheckoutPath = (
  remaining: number,
  dartsRemaining: number,
  rules: CheckoutRules,
  path: CheckoutDart[] = [],
): CheckoutDart[] | null => {
  if (remaining < 0 || (rules.doubleOut && remaining === 1)) {
    return null
  }

  if (dartsRemaining === 0) {
    return remaining === 0 ? path : null
  }

  if (dartsRemaining === 1) {
    const finish = getSingleDartFinish(remaining, rules)

    return finish === null ? null : [...path, finish]
  }

  for (const dart of getFallbackSetupDartOptionsInPreferenceOrder()) {
    if (dart.points > remaining) {
      continue
    }

    const nextPath = findFallbackCheckoutPath(remaining - dart.points, dartsRemaining - 1, rules, [
      ...path,
      dart,
    ])

    if (nextPath !== null) {
      return nextPath
    }
  }

  return null
}

export const labelsToCheckoutPath = (labels: readonly string[]): CheckoutDart[] =>
  labels.map((label) => checkoutDartFromLabel(label))
