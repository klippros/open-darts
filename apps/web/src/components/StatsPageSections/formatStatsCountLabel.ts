export const formatStatsCountLabel = (count: number, unit: 'Session' | 'Leg'): string => {
  const pluralized = count === 1 ? unit : `${unit}s`

  return `${count} ${pluralized}`
}
