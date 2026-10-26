import { describe, expect, it } from 'vitest'
import type { StatTimelinePoint } from './statTimelines'
import {
  getLatestTrend,
  getTrailingAverages,
  getTrendSampleCount,
  STAT_TREND_WINDOW,
} from './statTrend'

const point = (value: number | null, id = 'session'): StatTimelinePoint => ({
  sessionId: id,
  completedAt: '2026-01-01T10:00:00.000Z',
  sessionLabel: 'Session',
  value,
})

describe('getTrailingAverages', () => {
  it('returns the value itself for a single plottable point', () => {
    expect(getTrailingAverages([point(50)])).toEqual([50])
  })

  it('uses every point on a short series', () => {
    const averages = getTrailingAverages([point(40), point(60), point(50)])

    expect(averages).toEqual([40, 50, 50])
  })

  it('averages only the last window of results', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200]
    const points = values.map((value, index) => point(value, `s-${index}`))
    const averages = getTrailingAverages(points, STAT_TREND_WINDOW)

    expect(averages[0]).toBe(10)
    expect(averages[1]).toBe(15)
    expect(averages[9]).toBe(55)
    expect(averages[10]).toBe(74)
  })

  it('skips null values when filling the window', () => {
    const averages = getTrailingAverages([point(10), point(null), point(30), point(50)])

    expect(averages).toEqual([10, null, 20, 30])
  })
})

describe('getTrendSampleCount', () => {
  it('counts plottable points up to the index, capped at the window', () => {
    const points = [point(10), point(null), point(30), point(50)]

    expect(getTrendSampleCount(points, 0)).toBe(1)
    expect(getTrendSampleCount(points, 2)).toBe(2)
    expect(getTrendSampleCount(points, 3)).toBe(3)
  })
})

describe('getLatestTrend', () => {
  it('returns null when there is no trend yet', () => {
    expect(getLatestTrend([null])).toBeNull()
    expect(getLatestTrend([])).toBeNull()
  })

  it('returns the latest average and the sample count used', () => {
    expect(getLatestTrend([40, 50, 55])).toEqual({ value: 55, sampleCount: 3 })
  })

  it('caps the sample count at the window size', () => {
    const averages = Array.from({ length: 15 }, () => 60)

    expect(getLatestTrend(averages, STAT_TREND_WINDOW)).toEqual({
      value: 60,
      sampleCount: 10,
    })
  })
})
