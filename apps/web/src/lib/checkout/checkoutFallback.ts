import type { CheckoutRules } from '../../types/checkout'
import type { CheckoutDart } from './checkoutDart'
import { checkoutDartFromLabel } from './checkoutDart'

const DOUBLE_FINISH_SEGMENT_PREFERENCE_ORDER = [
  20, 16, 10, 8, 12, 6, 4, 2, 18, 14, 15, 17, 19, 7, 9, 11, 13, 5, 3, 1,
] as const

const WEDGE_SEGMENT_PREFERENCE_ORDER = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
] as const

const UNKNOWN_FINISH_PREFERENCE_RANK = 999

const isDoubleOutFinishDart = (dart: CheckoutDart): boolean =>
  dart.label === 'Bull' || dart.label.startsWith('D')

const getFinishPreferenceRank = (dart: CheckoutDart): number => {
  if (dart.label === 'Bull') {
    return 0
  }

  if (!dart.label.startsWith('D')) {
    return UNKNOWN_FINISH_PREFERENCE_RANK
  }

  const segment = Number(dart.label.slice(1))
  const index = DOUBLE_FINISH_SEGMENT_PREFERENCE_ORDER.findIndex((value) => value === segment)

  return index === -1 ? UNKNOWN_FINISH_PREFERENCE_RANK : index + 1
}

const isTrebleDart = (dart: CheckoutDart): boolean => dart.label.startsWith('T')

const isDoubleDart = (dart: CheckoutDart): boolean => dart.label.startsWith('D')

const isBullOrOuterBullSetupDart = (dart: CheckoutDart): boolean =>
  dart.label === 'Bull' || dart.label === '25'

type CheckoutPathScore = readonly [
  finishRank: number,
  dartCount: number,
  trebleCount: number,
  doubleCount: number,
  bullCount: number,
  firstSetupDartPoints: number,
  totalSetupPoints: number,
]

const scoreCheckoutPath = (path: CheckoutDart[]): CheckoutPathScore => {
  const finish = path[path.length - 1]
  const setup = path.slice(0, -1)

  return [
    getFinishPreferenceRank(finish),
    path.length,
    setup.filter(isTrebleDart).length,
    setup.filter(isDoubleDart).length,
    setup.filter(isBullOrOuterBullSetupDart).length,
    setup[0]?.points ?? 0,
    setup.reduce((total, dart) => total + dart.points, 0),
  ]
}

const isCheckoutPathScoreBetter = (left: CheckoutPathScore, right: CheckoutPathScore): boolean => {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] < right[index]
    }
  }

  return false
}

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

const collectFallbackCheckoutPaths = (
  remaining: number,
  dartsRemaining: number,
  rules: CheckoutRules,
  path: CheckoutDart[] = [],
  paths: CheckoutDart[][] = [],
): void => {
  if (remaining < 0 || (rules.doubleOut && remaining === 1)) {
    return
  }

  if (dartsRemaining === 0) {
    if (remaining === 0) {
      paths.push(path)
    }

    return
  }

  if (dartsRemaining === 1) {
    const finish = getSingleDartFinish(remaining, rules)

    if (finish !== null) {
      paths.push([...path, finish])
    }

    return
  }

  for (const dart of getFallbackSetupDartOptionsInPreferenceOrder()) {
    if (dart.points > remaining) {
      continue
    }

    collectFallbackCheckoutPaths(
      remaining - dart.points,
      dartsRemaining - 1,
      rules,
      [...path, dart],
      paths,
    )
  }
}

const pickBestCheckoutPath = (paths: CheckoutDart[][]): CheckoutDart[] | null => {
  let bestPath: CheckoutDart[] | null = null
  let bestScore: CheckoutPathScore | null = null

  for (const path of paths) {
    const score = scoreCheckoutPath(path)

    if (bestScore === null || isCheckoutPathScoreBetter(score, bestScore)) {
      bestPath = path
      bestScore = score
    }
  }

  return bestPath
}

export const findFallbackCheckoutPath = (
  remaining: number,
  dartsRemaining: number,
  rules: CheckoutRules,
): CheckoutDart[] | null => {
  const paths: CheckoutDart[][] = []

  collectFallbackCheckoutPaths(remaining, dartsRemaining, rules, [], paths)

  return pickBestCheckoutPath(paths)
}

export const findBestFallbackCheckoutPath = (
  remaining: number,
  maxDartsRemaining: number,
  rules: CheckoutRules,
): CheckoutDart[] | null => {
  const paths: CheckoutDart[][] = []

  for (let dartCount = 1; dartCount <= maxDartsRemaining; dartCount += 1) {
    collectFallbackCheckoutPaths(remaining, dartCount, rules, [], paths)
  }

  return pickBestCheckoutPath(paths)
}

export const labelsToCheckoutPath = (labels: readonly string[]): CheckoutDart[] =>
  labels.map((label) => checkoutDartFromLabel(label))
