import { isValidVisitScore, MAX_VISIT_SCORE } from '../../x01/x01Rules'

const UNITS: Record<string, number> = {
  zero: 0,
  oh: 0,
  nil: 0,
  nought: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
}

const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

const parseDigitToken = (token: string): number | null => {
  if (!/^\d{1,3}$/u.test(token)) {
    return null
  }

  const value = Number(token)

  return isValidVisitScore(value) ? value : null
}

const parseBelowHundred = (
  peek: () => string | undefined,
  take: () => string | undefined,
): number | null => {
  const unit = UNITS[peek() ?? '']
  const teen = TEENS[peek() ?? '']
  const ten = TENS[peek() ?? '']

  if (unit !== undefined) {
    take()
    return unit
  }

  if (teen !== undefined) {
    take()
    return teen
  }

  if (ten !== undefined) {
    take()
    let total = ten
    const nextUnit = UNITS[peek() ?? '']
    if (nextUnit !== undefined && nextUnit > 0) {
      take()
      total += nextUnit
    }
    return total
  }

  return null
}

/**
 * Parse a spoken visit total (0–180) from normalized tokens.
 * Accepts digits ("180"), English number words, and "no score" for a zero visit.
 */
export const parseVisitScoreCommand = (tokens: string[]): number | null => {
  if (tokens.length === 0) {
    return null
  }

  if (
    (tokens.length === 2 && tokens[0] === 'no' && tokens[1] === 'score') ||
    (tokens.length === 1 &&
      (tokens[0] === 'noscore' || tokens[0] === 'nil' || tokens[0] === 'nought'))
  ) {
    return 0
  }

  if (tokens.length === 1) {
    const digit = parseDigitToken(tokens[0] ?? '')

    if (digit !== null) {
      return digit
    }
  }

  let index = 0
  const peek = (): string | undefined => tokens[index]
  const take = (): string | undefined => {
    const token = tokens[index]
    index += 1
    return token
  }

  let total = 0

  if (peek() === 'a' || peek() === 'one') {
    const leading = take()

    if (peek() === 'hundred') {
      take()
      total = 100
    } else if (leading === 'one' && peek() === 'eighty') {
      take()
      total = 180
    } else if (leading === 'one') {
      total = 1
    } else {
      return null
    }
  } else if (peek() === 'hundred') {
    take()
    total = 100
  }

  if (total === 100) {
    if (peek() === 'and') {
      take()
    }

    if (peek() !== undefined) {
      const remainder = parseBelowHundred(peek, take)

      if (remainder === null) {
        return null
      }

      total += remainder
    }
  } else if (total === 0) {
    const value = parseBelowHundred(peek, take)

    if (value === null) {
      return null
    }

    total = value
  }

  if (index !== tokens.length || total < 0 || total > MAX_VISIT_SCORE) {
    return null
  }

  return total
}
