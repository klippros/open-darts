export const formatAverage = (average: number | null, digits = 2): string =>
  average === null ? '—' : average.toFixed(digits)

export const formatPercent = (rate: number | null, digits = 2): string =>
  rate === null ? '—' : `${rate.toFixed(digits)}%`

export const formatCount = (value: number | null, digits = 2): string =>
  value === null ? '—' : value.toFixed(digits)

export const formatInteger = (value: number | null): string =>
  value === null ? '—' : String(Math.round(value))

export const formatDoubleCheckout = ({
  successes,
  attempts,
}: {
  successes: number
  attempts: number
}): string => {
  if (attempts === 0) {
    return '—'
  }

  const percentage = (successes / attempts) * 100

  return `${percentage.toFixed(2)}% (${successes}/${attempts})`
}

export const getDoubleCheckoutRate = ({
  successes,
  attempts,
}: {
  successes: number
  attempts: number
}): number | null => (attempts === 0 ? null : (successes / attempts) * 100)
