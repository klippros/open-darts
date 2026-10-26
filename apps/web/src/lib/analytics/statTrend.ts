import type { StatTimelinePoint } from './statTimelines'

export const STAT_TREND_WINDOW = 10

export interface LatestTrend {
  value: number
  sampleCount: number
}

export const getTrailingAverages = (
  points: StatTimelinePoint[],
  window: number = STAT_TREND_WINDOW,
): (number | null)[] => {
  const recentValues: number[] = []

  return points.map((point) => {
    if (point.value === null) {
      return null
    }

    recentValues.push(point.value)

    if (recentValues.length > window) {
      recentValues.shift()
    }

    const sum = recentValues.reduce((total, value) => total + value, 0)
    return sum / recentValues.length
  })
}

export const getTrendSampleCount = (
  points: StatTimelinePoint[],
  index: number,
  window: number = STAT_TREND_WINDOW,
): number => {
  let count = 0

  for (let lookback = 0; lookback <= index; lookback += 1) {
    if (points[lookback]?.value !== null && points[lookback]?.value !== undefined) {
      count += 1
    }
  }

  return Math.min(count, window)
}

export const getLatestTrend = (
  averages: (number | null)[],
  window: number = STAT_TREND_WINDOW,
): LatestTrend | null => {
  let latestValue: number | null = null
  let nonNullAverageCount = 0

  for (const average of averages) {
    if (average === null) {
      continue
    }

    latestValue = average
    nonNullAverageCount += 1
  }

  if (latestValue === null) {
    return null
  }

  return {
    value: latestValue,
    sampleCount: Math.min(nonNullAverageCount, window),
  }
}
