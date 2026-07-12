import { Stack } from '@chakra-ui/react'
import type {
  CheckoutPracticeStats,
  OtherPracticeStats,
  X01LegStats,
} from '../../lib/analytics/computeAnalytics'
import type { StatMetricId, StatTimelineSelection } from '../../lib/analytics/statTimelines'
import {
  MatchStatRowId,
  formatStatsPageRowValue,
  getVisibleStatsPageRows,
  x01LegStatsToPlayerMatchStats,
} from '../../lib/analytics/matchStatRows'
import { StatsTable } from '../StatsTable/StatsTable'
import { CheckoutPracticeCard, OtherPracticeCard } from './PracticeStatCards'
import { EmptySection, SectionHeading } from './StatCard'

export type StatTimelineSelectHandler = (selection: StatTimelineSelection) => void

export { EmptySection } from './StatCard'

const STATS_PAGE_PLAYER_ID = 'stats-page-player'

const timelineRowConfig: Record<MatchStatRowId, { metric: StatMetricId; metricLabel: string }> = {
  [MatchStatRowId.ThreeDartAverage]: {
    metric: 'threeDartAverage',
    metricLabel: 'Avg (3-darts)',
  },
  [MatchStatRowId.Thrown180]: {
    metric: 'thrown180',
    metricLabel: '180',
  },
  [MatchStatRowId.Thrown140Plus]: {
    metric: 'thrown140Plus',
    metricLabel: '140+',
  },
  [MatchStatRowId.Thrown100Plus]: {
    metric: 'thrown100Plus',
    metricLabel: '100+',
  },
  [MatchStatRowId.HighestVisit]: {
    metric: 'highestVisit',
    metricLabel: 'Highest visit',
  },
  [MatchStatRowId.Checkouts]: {
    metric: 'doubleCheckoutRate',
    metricLabel: 'Checkouts',
  },
  [MatchStatRowId.Checkouts100Plus]: {
    metric: 'checkouts100Plus',
    metricLabel: 'Checkouts 100+',
  },
  [MatchStatRowId.HighestCheckout]: {
    metric: 'highestCheckout',
    metricLabel: 'Highest checkout',
  },
  [MatchStatRowId.BestGameAverage]: {
    metric: 'bestGameAverage',
    metricLabel: 'Best game avg',
  },
  [MatchStatRowId.ThreeDartAverageUntil170]: {
    metric: 'threeDartAverageUntil170',
    metricLabel: 'Avg to 170 (3-darts)',
  },
  [MatchStatRowId.AvgDarts]: {
    metric: 'avgDarts',
    metricLabel: 'Avg darts',
  },
}

export interface X01LegSectionProps {
  title: string
  subtitle: string
  emptyMessage: string
  stats: X01LegStats
  scope: StatTimelineSelection['scope']
  onStatSelect: StatTimelineSelectHandler
}

export const X01LegSection = ({
  title,
  subtitle,
  emptyMessage,
  stats,
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

  const playerStats = x01LegStatsToPlayerMatchStats(stats)
  const statsByPlayer = { [STATS_PAGE_PLAYER_ID]: playerStats }
  const rows = getVisibleStatsPageRows(statsByPlayer, [STATS_PAGE_PLAYER_ID])

  return (
    <Stack gap={4}>
      <SectionHeading
        title={title}
        subtitle={`${stats.gameCount} saved game${stats.gameCount === 1 ? '' : 's'} · ${stats.checkoutGameCount} checked out`}
      />
      <StatsTable
        players={[{ id: STATS_PAGE_PLAYER_ID, name: '' }]}
        statsByPlayer={statsByPlayer}
        rows={rows}
        formatCell={(row) => formatStatsPageRowValue(row.id, stats)}
        isRowClickable={(rowId) => rowId in timelineRowConfig}
        onRowClick={(rowId) => {
          const config = timelineRowConfig[rowId]

          onStatSelect({
            scope,
            metric: config.metric,
            metricLabel: config.metricLabel,
            scopeLabel: title,
          })
        }}
      />
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
