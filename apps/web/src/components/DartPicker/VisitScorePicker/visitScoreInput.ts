import { isValidVisitScore, MAX_VISIT_SCORE } from '../../../lib/x01/x01Rules'

export const appendVisitScoreDigit = (current: string, digit: string): string => {
  if (!/^\d$/u.test(digit)) {
    return current
  }

  const next = current === '0' ? digit : `${current}${digit}`
  const asNumber = Number(next)

  if (!Number.isInteger(asNumber) || asNumber > MAX_VISIT_SCORE) {
    return current
  }

  return next
}

export const backspaceVisitScoreInput = (current: string): string => current.slice(0, -1)

export const parseVisitScoreInput = (current: string): number | null => {
  if (current === '') {
    return null
  }

  const score = Number(current)

  return isValidVisitScore(score) ? score : null
}
