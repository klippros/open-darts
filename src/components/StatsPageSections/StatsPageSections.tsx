import { SimpleGrid, Stack } from '@chakra-ui/react'
import type {
  CheckoutPracticeStats,
  OtherPracticeStats,
  X01LegStats,
} from '../../lib/analytics/computeAnalytics'
import type { StatMetricId, StatTimelineSelection } from '../../lib/analytics/statTimelines'
import { formatAverage, formatInteger, formatPercent } from '../../lib/analytics/formatAnalytics'
import { CheckoutPracticeCard, OtherPracticeCard } from './PracticeStatCards'
import { EmptySection, SectionHeading, StatCard } from './StatCard'

export type StatTimelineSelectHandler = (selection: StatTimelineSelection) => void

export { EmptySection } from './StatCard'

export interface X01LegSectionProps {
  title: string
  subtitle: string
  emptyMessage: string
  stats: X01LegStats
  avgDartsLabel: string
  scope: StatTimelineSelection['scope']
  onStatSelect: StatTimelineSelectHandler
}

const createX01Selection = (
  scope: StatTimelineSelection['scope'],
  scopeLabel: string,
  metric: StatMetricId,
  metricLabel: string,
): StatTimelineSelection => ({
  scope,
  metric,
  metricLabel,
  scopeLabel,
})

export const X01LegSection = ({
  title,
  subtitle,
  emptyMessage,
  stats,
  avgDartsLabel,
  scope,
  onStatSelect,
}: X01LegSectionProps) => {
  if (stats.gameCount === 0) {
    return (
      <Stack gap={4}>
        <SectionHeading title={title} subtitle={subtitle} />
        <EmptySection message={emptyMessage} />
      </Stack>
    )
  }

  const selectStat = (metric: StatMetricId, metricLabel: string) => () => {
    onStatSelect(createX01Selection(scope, title, metric, metricLabel))
  }

  return (
    <Stack gap={4}>
      <SectionHeading
        title={title}
        subtitle={`${stats.gameCount} saved game${stats.gameCount === 1 ? '' : 's'} · ${stats.checkoutGameCount} checked out`}
      />
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={3}>
        <StatCard
          label="3-dart average"
          value={formatAverage(stats.threeDartAverage)}
          onClick={selectStat('threeDartAverage', '3-dart average')}
        />
        <StatCard
          label="Best game avg"
          value={formatAverage(stats.bestGameAverage)}
          detail="Highest 3-dart average in one leg"
          onClick={selectStat('threeDartAverage', '3-dart average per game')}
        />
        <StatCard
          label="Avg until 170"
          value={formatAverage(stats.threeDartAverageUntil170)}
          detail="Scoring visits before checkout range"
          onClick={selectStat('threeDartAverageUntil170', 'Avg until 170')}
        />
        <StatCard
          label="Checkout rate"
          value={formatPercent(stats.checkoutRate)}
          onClick={selectStat('checkoutRate', 'Checkout rate')}
        />
        <StatCard
          label={avgDartsLabel}
          value={formatInteger(stats.avgDarts)}
          detail={
            stats.checkoutDartCount === 0
              ? 'Checked-out legs only'
              : `From ${stats.checkoutDartCount} checked-out leg${stats.checkoutDartCount === 1 ? '' : 's'}`
          }
          onClick={selectStat('avgDarts', avgDartsLabel)}
        />
      </SimpleGrid>
    </Stack>
  )
}

export interface PracticeSectionProps {
  checkout: CheckoutPracticeStats[]
  other: OtherPracticeStats[]
  onStatSelect: StatTimelineSelectHandler
}

export const PracticeSection = ({ checkout, other, onStatSelect }: PracticeSectionProps) => {
  if (checkout.length === 0 && other.length === 0) {
    return (
      <Stack gap={4}>
        <SectionHeading title="Practice" subtitle="Checkout and training mode stats." />
        <EmptySection message="No saved practice sessions in this period yet." />
      </Stack>
    )
  }

  return (
    <Stack gap={4}>
      <SectionHeading title="Practice" subtitle="Checkout and training mode stats." />
      <Stack gap={3}>
        {checkout.map((stats) => (
          <CheckoutPracticeCard key={stats.mode} stats={stats} onStatSelect={onStatSelect} />
        ))}
        {other.map((stats) => (
          <OtherPracticeCard key={stats.mode} stats={stats} onStatSelect={onStatSelect} />
        ))}
      </Stack>
    </Stack>
  )
}
