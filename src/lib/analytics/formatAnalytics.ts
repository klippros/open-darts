export const formatAverage = (average: number | null): string =>
  average === null ? '—' : average.toFixed(1)

export const formatPercent = (rate: number | null): string =>
  rate === null ? '—' : `${rate.toFixed(0)}%`

export const formatCount = (value: number | null, digits = 1): string =>
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

  const percentage = Math.round((successes / attempts) * 100)

  return `${percentage}% (${successes}/${attempts})`
}

export const getDoubleCheckoutRate = ({
  successes,
  attempts,
}: {
  successes: number
  attempts: number
}): number | null => (attempts === 0 ? null : (successes / attempts) * 100)
