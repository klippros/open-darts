import type { DartThrow } from '../../types/dart'
import type { X01Config } from '../../types/x01'
import { formatDart } from '../formatDart'

const MAX_CHECKOUT_SCORE = 170

interface CheckoutDart {
  label: string
  points: number
}

const getDartOptions = (): CheckoutDart[] => {
  const options: CheckoutDart[] = [{ label: 'Bull', points: 50 }, { label: '25', points: 25 }]

  for (let value = 20; value >= 1; value -= 1) {
    options.push({ label: `T${value}`, points: value * 3 })
    options.push({ label: `D${value}`, points: value * 2 })
    options.push({ label: String(value), points: value })
  }

  return options.sort((left, right) => right.points - left.points)
}

const getFinishDartOptions = (): CheckoutDart[] =>
  getDartOptions().filter(isDoubleOutFinishDart)

const isValidCheckoutFinish = (remaining: number): boolean => remaining === 0

const isDoubleOutFinishDart = (dart: CheckoutDart): boolean =>
  dart.label === 'Bull' || dart.label.startsWith('D')

const isValidFinalDart = (dart: CheckoutDart, remaining: number, config: X01Config): boolean => {
  if (dart.points !== remaining) {
    return false
  }

  if (!config.doubleOut) {
    return true
  }

  return isDoubleOutFinishDart(dart)
}

const findCheckoutPath = (
  remaining: number,
  dartsRemaining: number,
  config: X01Config,
  path: CheckoutDart[],
): CheckoutDart[] | null => {
  if (remaining < 0 || (config.doubleOut && remaining === 1)) {
    return null
  }

  if (dartsRemaining === 0) {
    return isValidCheckoutFinish(remaining) ? path : null
  }

  if (dartsRemaining === 1) {
    const finishOptions = config.doubleOut ? getFinishDartOptions() : getDartOptions()

    for (const dart of finishOptions) {
      if (isValidFinalDart(dart, remaining, config)) {
        return [...path, dart]
      }
    }

    return null
  }

  for (const dart of getDartOptions()) {
    if (dart.points > remaining) {
      continue
    }

    const nextPath = findCheckoutPath(remaining - dart.points, dartsRemaining - 1, config, [
      ...path,
      dart,
    ])

    if (nextPath !== null) {
      return nextPath
    }
  }

  return null
}

export const isInCheckoutRange = (remaining: number, config: X01Config): boolean => {
  if (remaining > MAX_CHECKOUT_SCORE || remaining < 2) {
    return false
  }

  if (config.doubleOut && remaining === 1) {
    return false
  }

  return findCheckoutPath(remaining, 3, config, []) !== null
}

export const suggestCheckoutPath = (
  remaining: number,
  dartsRemaining: number,
  config: X01Config,
): CheckoutDart[] | null => {
  if (remaining > MAX_CHECKOUT_SCORE || remaining < 2 || (config.doubleOut && remaining === 1)) {
    return null
  }

  for (let dartCount = 1; dartCount <= dartsRemaining; dartCount += 1) {
    const path = findCheckoutPath(remaining, dartCount, config, [])

    if (path !== null) {
      return path
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
  config: X01Config,
): VisitDartSlotView[] => {
  const thrownPoints = pendingDarts.reduce((total, dart) => total + dart.points, 0)
  const remaining = scoreBeforeVisit - thrownPoints
  const dartsRemaining = 3 - pendingDarts.length
  const checkoutPath = suggestCheckoutPath(remaining, dartsRemaining, config) ?? []
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
