export const formatAverage = (average: number | null): string =>
  average === null ? '—' : average.toFixed(1)

export const formatPercent = (rate: number | null): string =>
  rate === null ? '—' : `${rate.toFixed(0)}%`

export const formatCount = (value: number | null, digits = 1): string =>
  value === null ? '—' : value.toFixed(digits)
