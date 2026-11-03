import { describe, expect, it } from 'vitest'
import {
  buildAroundTheClockScoreMetrics,
  buildAverageScoreMetrics,
  buildVisitScoreMetric,
  scoreMetricsFromSecondaryLabel,
} from './scoreMetrics'

describe('scoreMetrics', () => {
  it('builds leg and visit metrics for challenge', () => {
    expect(
      buildAverageScoreMetrics({
        legAverage: 40,
        matchAverage: 40,
        currentLeg: 1,
        challengeScoreDetails: {
          visitLabel: '2/11',
          visitOverLimit: false,
          targetAverage: 45.5,
        },
      }),
    ).toEqual([
      { label: 'Leg', value: '40.0', valueColor: 'red.300' },
      { label: 'Visit', value: '2/11' },
    ])
  })

  it('adds match average from leg 2 and greens on-pace leg averages', () => {
    expect(
      buildAverageScoreMetrics({
        legAverage: 70,
        matchAverage: 55,
        currentLeg: 2,
        challengeScoreDetails: {
          visitLabel: '3/11',
          visitOverLimit: false,
          targetAverage: 45.5,
        },
      }),
    ).toEqual([
      { label: 'Leg', value: '70.0', valueColor: 'green.300' },
      { label: 'Match', value: '55.0' },
      { label: 'Visit', value: '3/11' },
    ])
  })

  it('builds around the clock metrics', () => {
    expect(
      buildAroundTheClockScoreMetrics({
        dartsThrown: 12,
        dartsOnCurrentTarget: 2,
        avgDartsPerTarget: 3.5,
      }),
    ).toEqual([
      { label: 'Current', value: '2' },
      { label: 'Avg', value: '3.5' },
    ])
  })

  it('builds visit progress metrics', () => {
    expect(buildVisitScoreMetric(2, 3)).toEqual([{ label: 'Visit', value: '2/3' }])
  })

  it('maps target secondary labels to metrics', () => {
    expect(scoreMetricsFromSecondaryLabel('Target D1')).toEqual([{ label: 'Target', value: 'D1' }])
    expect(scoreMetricsFromSecondaryLabel('Checkout target')).toEqual([
      { label: 'Target', value: 'Checkout' },
    ])
  })
})
