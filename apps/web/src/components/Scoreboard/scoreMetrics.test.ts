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

  it('adds match checkout percentage for multi-leg matches', () => {
    expect(
      buildAverageScoreMetrics({
        legAverage: 45.2,
        matchAverage: 45.2,
        currentLeg: 1,
        checkout: { successes: 1, attempts: 3 },
      }),
    ).toEqual([
      { label: 'Leg', value: '45.2' },
      { label: 'Checkout', value: '33% (1/3)' },
    ])
  })

  it('rounds checkout percentage to the nearest whole percent', () => {
    expect(
      buildAverageScoreMetrics({
        legAverage: 40,
        matchAverage: 40,
        currentLeg: 1,
        checkout: { successes: 2, attempts: 3 },
      }),
    ).toEqual([
      { label: 'Leg', value: '40.0' },
      { label: 'Checkout', value: '67% (2/3)' },
    ])
  })

  it('places checkout after the match average from leg 2', () => {
    expect(
      buildAverageScoreMetrics({
        legAverage: 70,
        matchAverage: 55,
        currentLeg: 2,
        checkout: { successes: 1, attempts: 2 },
      }),
    ).toEqual([
      { label: 'Leg', value: '70.0' },
      { label: 'Match', value: '55.0' },
      { label: 'Checkout', value: '50% (1/2)' },
    ])
  })

  it('shows a dash when a multi-leg match has no checkout attempts yet', () => {
    expect(
      buildAverageScoreMetrics({
        legAverage: null,
        matchAverage: null,
        currentLeg: 1,
        checkout: { successes: 0, attempts: 0 },
      }),
    ).toEqual([
      { label: 'Leg', value: '—' },
      { label: 'Checkout', value: '—' },
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
