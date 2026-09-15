import { describe, expect, it } from 'vitest'
import type { AroundTheClockPerTargetStats } from '../analytics/aroundTheClockStats'
import {
  getHeatmapColorForRatio,
  getHeatmapFillColor,
  getHeatmapPerformanceRatio,
  getOverallAvgDartsPerHit,
  HEATMAP_LEGEND_STOPS,
} from './aroundTheClockHeatmapColors'

const target = (
  overrides: Partial<AroundTheClockPerTargetStats> = {},
): AroundTheClockPerTargetStats => ({
  targetIndex: 0,
  label: '1',
  attemptCount: 1,
  hitCount: 1,
  avgDartsPerHit: 2,
  bestDarts: 1,
  ...overrides,
})

describe('aroundTheClockHeatmapColors', () => {
  it('computes overall average from targets with hits', () => {
    expect(
      getOverallAvgDartsPerHit([
        target({ avgDartsPerHit: 2 }),
        target({ targetIndex: 1, label: '2', avgDartsPerHit: 4 }),
        target({ targetIndex: 2, label: '3', avgDartsPerHit: null, attemptCount: 0 }),
      ]),
    ).toBe(3)
  })

  it('returns null ratio when there is no comparable average', () => {
    expect(getHeatmapPerformanceRatio(2, null)).toBeNull()
    expect(getHeatmapPerformanceRatio(null, 2)).toBeNull()
  })

  it('colors better-than-average targets greener than worse targets', () => {
    const overallAverage = 2
    const better = getHeatmapFillColor(target({ avgDartsPerHit: 1 }), overallAverage, '#1a1a1a')
    const average = getHeatmapFillColor(target({ avgDartsPerHit: 2 }), overallAverage, '#1a1a1a')
    const worse = getHeatmapFillColor(target({ avgDartsPerHit: 4 }), overallAverage, '#1a1a1a')

    expect(better).not.toBe('#1a1a1a')
    expect(average).not.toBe(better)
    expect(worse).not.toBe(average)
  })

  it('uses yellow at the average ratio', () => {
    expect(getHeatmapColorForRatio(1)).toBe(HEATMAP_LEGEND_STOPS[1].color)
  })

  it('uses base fill when there is no target data', () => {
    expect(
      getHeatmapFillColor(
        target({ attemptCount: 0, hitCount: 0, avgDartsPerHit: null, bestDarts: null }),
        2,
        '#3a3634',
      ),
    ).toBe('#3a3634')
  })

  it('highlights failed attempts without hits', () => {
    expect(
      getHeatmapFillColor(
        target({ attemptCount: 2, hitCount: 0, avgDartsPerHit: null, bestDarts: null }),
        2,
        '#3a3634',
      ),
    ).toBe('#4a1f28')
  })
})
