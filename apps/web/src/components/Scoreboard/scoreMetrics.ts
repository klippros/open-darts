import { isOnChallengeAveragePace } from '@open-darts/game/game/challenge'
import type { AroundTheClockLiveStats } from '../../lib/analytics/aroundTheClockStats'
import type { DoubleCheckoutStats } from '../../lib/analytics/doubleCheckoutStats'
import { formatDoubleCheckout } from '../../lib/analytics/formatAnalytics'

export interface ScoreMetric {
  label: string
  value: string
  valueColor?: string
}

export interface ChallengeScoreDetails {
  visitLabel: string
  visitOverLimit: boolean
  targetAverage: number
}

const formatAverageValue = (average: number | null): string =>
  average === null ? '—' : average.toFixed(1)

export const buildAverageScoreMetrics = ({
  legAverage,
  matchAverage,
  currentLeg,
  challengeScoreDetails,
  checkout,
}: {
  legAverage: number | null
  matchAverage: number | null
  currentLeg?: number
  challengeScoreDetails?: ChallengeScoreDetails
  checkout?: DoubleCheckoutStats
}): ScoreMetric[] => {
  const legValueColor =
    challengeScoreDetails === undefined || legAverage === null
      ? undefined
      : isOnChallengeAveragePace(legAverage, challengeScoreDetails.targetAverage)
        ? 'green.300'
        : 'red.300'

  const metrics: ScoreMetric[] = [
    {
      label: 'Leg',
      value: formatAverageValue(legAverage),
      valueColor: legValueColor,
    },
  ]

  if (currentLeg !== undefined && currentLeg >= 2) {
    metrics.push({
      label: 'Match',
      value: formatAverageValue(matchAverage),
    })
  }

  if (checkout !== undefined) {
    metrics.push({
      label: 'Checkout',
      value: formatDoubleCheckout(checkout),
    })
  }

  if (challengeScoreDetails !== undefined) {
    metrics.push({
      label: 'Visit',
      value: challengeScoreDetails.visitLabel,
      valueColor: challengeScoreDetails.visitOverLimit ? 'red.300' : undefined,
    })
  }

  return metrics
}

export const buildAroundTheClockScoreMetrics = (stats: AroundTheClockLiveStats): ScoreMetric[] => [
  {
    label: 'Current',
    value: String(stats.dartsOnCurrentTarget),
  },
  {
    label: 'Avg',
    value: stats.avgDartsPerTarget === null ? '—' : stats.avgDartsPerTarget.toFixed(1),
  },
]

export const buildVisitScoreMetric = (visitsUsed: number, maxVisits: number): ScoreMetric[] => [
  {
    label: 'Visit',
    value: `${visitsUsed}/${maxVisits}`,
  },
]

export const scoreMetricsFromSecondaryLabel = (secondaryLabel: string): ScoreMetric[] => {
  if (secondaryLabel === 'Checkout target') {
    return [{ label: 'Target', value: 'Checkout' }]
  }

  if (secondaryLabel.startsWith('Target ')) {
    return [{ label: 'Target', value: secondaryLabel.slice('Target '.length) }]
  }

  return [{ label: '', value: secondaryLabel }]
}
