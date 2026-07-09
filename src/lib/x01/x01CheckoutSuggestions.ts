import type { X01Config } from '../../types/x01'

const MAX_CHECKOUT_SCORE = 170

const dartScores = (): number[] => {
  const scores = new Set<number>()

  for (let value = 1; value <= 20; value += 1) {
    scores.add(value)
    scores.add(value * 2)
    scores.add(value * 3)
  }

  scores.add(25)
  scores.add(50)

  return [...scores].sort((left, right) => right - left)
}

const isValidCheckoutFinish = (remaining: number, config: X01Config): boolean => {
  if (remaining !== 0) {
    return false
  }

  if (!config.doubleOut) {
    return true
  }

  return remaining === 0
}

const isValidFinalDart = (points: number, remaining: number, config: X01Config): boolean => {
  if (points !== remaining) {
    return false
  }

  if (!config.doubleOut) {
    return true
  }

  if (points === 50) {
    return true
  }

  return points >= 2 && points <= 40 && points % 2 === 0
}

const findCheckoutPath = (
  remaining: number,
  dartsRemaining: number,
  config: X01Config,
  path: number[],
): number[] | null => {
  if (remaining < 0 || (config.doubleOut && remaining === 1)) {
    return null
  }

  if (dartsRemaining === 0) {
    return isValidCheckoutFinish(remaining, config) ? path : null
  }

  if (dartsRemaining === 1) {
    for (const points of dartScores()) {
      if (isValidFinalDart(points, remaining, config)) {
        return [...path, points]
      }
    }

    return null
  }

  for (const points of dartScores()) {
    if (points > remaining) {
      continue
    }

    const nextPath = findCheckoutPath(remaining - points, dartsRemaining - 1, config, [
      ...path,
      points,
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
): number[] | null => {
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
  points: number | null
  label: string | null
}

export const getVisitDartSlots = (
  scoreBeforeVisit: number,
  pendingDarts: { points: number }[],
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
        points: thrown.points,
        label: String(thrown.points),
      })
      continue
    }

    const suggestedPoints = checkoutPath[suggestionIndex]

    if (suggestedPoints === undefined) {
      slots.push({ kind: 'empty', points: null, label: null })
      continue
    }

    suggestionIndex += 1
    slots.push({
      kind: 'suggested',
      points: suggestedPoints,
      label: String(suggestedPoints),
    })
  }

  return slots
}
