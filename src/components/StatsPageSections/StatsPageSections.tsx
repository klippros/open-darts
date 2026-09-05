import { Stack, Text } from '@chakra-ui/react'
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
import { StatsTable } from '../StatsTable/StatsTable'
import {
  AroundTheClockPracticeCard,
  Bob27PracticeCard,
  CheckoutPracticeCard,
} from './PracticeStatCards'
import { PracticeModeCard } from './PracticeModeCard'
import { EmptySection, SectionHeading } from './StatCard'
import { StatsVariantToggle } from './StatsVariantToggle'
import { useLastPlayedVariantSelection } from './useLastPlayedVariantSelection'

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

type X01VariantId = '501' | 'other'

interface X01Variant {
  id: X01VariantId
  label: string
  emptyMessage: string
  stats: X01LegStats
  scope: StatTimelineSelection['scope']
  lastPlayedAt: string | null
}

const getX01VariantKey = (variant: X01Variant): string => variant.id
const getX01LastPlayedAt = (variant: X01Variant): string | null => variant.lastPlayedAt

const buildX01Variants = (x01: X01Stats): X01Variant[] => {
  const variants: X01Variant[] = [
    {
      id: '501',
      label: '501',
      emptyMessage: 'No saved 501 games in this period yet.',
      stats: x01.fiveOhOne,
      scope: { type: 'x01-501' },
      lastPlayedAt: x01.fiveOhOne.lastPlayedAt,
    },
  ]

  if (x01.other.legCount > 0) {
    variants.push({
      id: 'other',
      label: 'Other',
      emptyMessage: 'No saved other x01 games in this period yet.',
      stats: x01.other,
      scope: { type: 'x01-other' },
      lastPlayedAt: x01.other.lastPlayedAt,
    })
  }

  return variants
}

export interface X01LegSectionProps {
  x01: X01Stats
  onStatSelect: StatTimelineSelectHandler
}

export const X01LegSection = ({ x01, onStatSelect }: X01LegSectionProps) => {
  const variants = buildX01Variants(x01)
  const { selectedKey, setSelectedKey, selected } = useLastPlayedVariantSelection(
    variants,
    getX01VariantKey,
    getX01LastPlayedAt,
  )

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
      value={selectedKey}
      onChange={setSelectedKey}
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
