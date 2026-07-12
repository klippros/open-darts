const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const

const joinParts = (parts: string[]): string => parts.filter((part) => part.length > 0).join(' ')

const numberToWordsPositive = (value: number): string => {
  if (value < 20) {
    return ONES[value] ?? String(value)
  }

  if (value < 100) {
    const tens = Math.floor(value / 10)
    const remainder = value % 10

    return joinParts([
      TENS[tens] ?? String(tens * 10),
      remainder > 0 ? (ONES[remainder] ?? '') : '',
    ])
  }

  if (value < 1000) {
    const hundreds = Math.floor(value / 100)
    const remainder = value % 100

    return joinParts([
      `${ONES[hundreds]} hundred`,
      remainder > 0 ? numberToWordsPositive(remainder) : '',
    ])
  }

  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1000)
    const remainder = value % 1000

    return joinParts([
      `${numberToWordsPositive(thousands)} thousand`,
      remainder > 0 ? numberToWordsPositive(remainder) : '',
    ])
  }

  return String(value)
}

export const numberToWords = (value: number): string => {
  if (value < 0) {
    return `minus ${numberToWordsPositive(-value)}`
  }

  return numberToWordsPositive(value)
}

export const capitalizeCallout = (phrase: string): string => {
  if (phrase.length === 0) {
    return phrase
  }

  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}`
}
