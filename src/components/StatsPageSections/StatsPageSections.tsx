import { Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import type {
  CheckoutPracticeStats,
  OtherPracticeStats,
  X01LegStats,
  X01Stats,
} from '../../lib/analytics/computeAnalytics'
import type { StatMetricId, StatTimelineSelection } from '../../lib/analytics/statTimelines'
import {
  MatchStatRowId,
  formatStatsPageRowValue,
  getVisibleStatsPageRows,
  x01LegStatsToPlayerMatchStats,
} from '../../lib/analytics/matchStatRows'
import {
  isAroundTheClockPracticeStats,
  isBob27PracticeStats,
} from '../../lib/analytics/practiceStats'
import { X01StatsFilterId } from '../../lib/analytics/x01Stats'
import { StatsTable } from '../StatsTable/StatsTable'
import {
  AroundTheClockPracticeCard,
  Bob27PracticeCard,
  CheckoutPracticeCard,
} from './PracticeStatCards'
import { PracticeModeCard } from './PracticeModeCard'
import { EmptySection, SectionHeading } from './StatCard'
import { StatsVariantToggle } from './StatsVariantToggle'

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
  [MatchStatRowId.BestLegAverage]: {
    metric: 'bestLegAverage',
    metricLabel: 'Best leg avg',
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

interface X01Variant {
  id: X01StatsFilterId
  label: string
  emptyMessage: string
  stats: X01LegStats
  scope: StatTimelineSelection['scope']
}

const buildX01Variants = (x01: X01Stats): X01Variant[] => [
  {
    id: X01StatsFilterId.FiveOhOne,
    label: '501',
    emptyMessage: 'No saved 501 games in this period yet.',
    stats: x01.fiveOhOne,
    scope: { type: 'x01-501' },
  },
  {
    id: X01StatsFilterId.FourOhOne,
    label: '401',
    emptyMessage: 'No saved 401 games in this period yet.',
    stats: x01.fourOhOne,
    scope: { type: 'x01-401' },
  },
  {
    id: X01StatsFilterId.ThreeOhOne,
    label: '301',
    emptyMessage: 'No saved 301 games in this period yet.',
    stats: x01.threeOhOne,
    scope: { type: 'x01-301' },
  },
  {
    id: X01StatsFilterId.All,
    label: 'All',
    emptyMessage: 'No saved x01 games in this period yet.',
    stats: x01.all,
    scope: { type: 'x01-all' },
  },
]

const parseX01StatsFilterId = (value: string): X01StatsFilterId | null => {
  switch (value) {
    case '501':
      return X01StatsFilterId.FiveOhOne
    case '401':
      return X01StatsFilterId.FourOhOne
    case '301':
      return X01StatsFilterId.ThreeOhOne
    case 'all':
      return X01StatsFilterId.All
    default:
      return null
  }
}

export interface X01LegSectionProps {
  x01: X01Stats
  onStatSelect: StatTimelineSelectHandler
}

export const X01LegSection = ({ x01, onStatSelect }: X01LegSectionProps) => {
  const variants = buildX01Variants(x01)
  const [selectedKey, setSelectedKey] = useState(X01StatsFilterId.FiveOhOne)
  const selected =
    variants.find((variant) => variant.id === selectedKey) ??
    variants.find((variant) => variant.id === X01StatsFilterId.FiveOhOne)

  if (selected === undefined) {
    return null
  }

  const { stats, scope, label, emptyMessage } = selected
  const trailing = (
    <StatsVariantToggle
      items={variants.map((variant) => ({
        value: variant.id,
        label: variant.label,
        count: variant.stats.legCount,
      }))}
      value={selected.id}
      onChange={(value) => {
        const nextFilter = parseX01StatsFilterId(value)

        if (nextFilter !== null) {
          setSelectedKey(nextFilter)
        }
      }}
      countUnit="Leg"
    />
  )

  if (stats.legCount === 0) {
    return (
      <PracticeModeCard title="x01" trailing={trailing}>
        <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
          {emptyMessage}
        </Text>
      </PracticeModeCard>
    )
  }

  const playerStats = x01LegStatsToPlayerMatchStats(stats)
  const statsByPlayer = { [STATS_PAGE_PLAYER_ID]: playerStats }
  const rows = getVisibleStatsPageRows(statsByPlayer, [STATS_PAGE_PLAYER_ID])

  return (
    <PracticeModeCard title="x01" trailing={trailing}>
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
            scopeLabel: label,
          })
        }}
      />
    </PracticeModeCard>
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

  const bob27 = other.find(isBob27PracticeStats)
  const aroundTheClock = other.filter(isAroundTheClockPracticeStats)

  return (
    <Stack gap={4}>
      <SectionHeading title="Practice" subtitle="Checkout and training mode stats." />
      <Stack gap={3}>
        {checkout.map((stats) => (
          <CheckoutPracticeCard key={stats.mode} stats={stats} onStatSelect={onStatSelect} />
        ))}
        {bob27 !== undefined && <Bob27PracticeCard stats={bob27} onStatSelect={onStatSelect} />}
        {aroundTheClock.length > 0 && (
          <AroundTheClockPracticeCard variants={aroundTheClock} onStatSelect={onStatSelect} />
        )}
      </Stack>
    </Stack>
  )
}
