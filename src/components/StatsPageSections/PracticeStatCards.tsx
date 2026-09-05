import { SimpleGrid, Stack } from '@chakra-ui/react'
import type {
  AroundTheClockPracticeStats,
  Bob27PracticeStats,
  CheckoutPracticeStats,
} from '../../lib/analytics/computeAnalytics'
import type { StatTimelineSelection } from '../../lib/analytics/statTimelines'
import {
  formatAverage,
  formatCount,
  formatInteger,
  formatPercent,
} from '../../lib/analytics/formatAnalytics'
import { getAroundTheClockAimModeLabel } from '../../lib/aroundTheClock/aroundTheClockConfig'
import { gameModeDefinitions } from '../../lib/game/gameModeDefinitions'
import { GameModeId } from '../../types/gameMode'
import { AroundTheClockHeatmap } from './AroundTheClockHeatmap/AroundTheClockHeatmap'
import { PracticeModeCard } from './PracticeModeCard'
import { StatCard } from './StatCard'
import { StatsCountLabel } from './StatsCountLabel'
import { StatsVariantToggle } from './StatsVariantToggle'
import { useLastPlayedVariantSelection } from './useLastPlayedVariantSelection'

const getAroundTheClockVariantKey = (stats: AroundTheClockPracticeStats): string => stats.aimMode
const getAroundTheClockLastPlayedAt = (stats: AroundTheClockPracticeStats): string =>
  stats.lastPlayedAt

export const CheckoutPracticeCard = ({
  stats,
  onStatSelect,
}: {
  stats: CheckoutPracticeStats
  onStatSelect: (selection: StatTimelineSelection) => void
}) => {
  const scope = { type: 'practice-checkout' as const, mode: stats.mode }
  const isOneTwentyOne = stats.mode === GameModeId.OneTwentyOne

  return (
    <PracticeModeCard title={stats.label} trailing={<StatsCountLabel count={stats.gameCount} />}>
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
        <StatCard
          label="Checkout rate"
          value={formatPercent(stats.checkoutRate)}
          onClick={() => {
            onStatSelect({
              scope,
              metric: 'checkoutRate',
              metricLabel: 'Checkout rate',
              scopeLabel: stats.label,
            })
          }}
        />
        <StatCard
          label="3-dart average"
          value={formatAverage(stats.threeDartAverage)}
          onClick={() => {
            onStatSelect({
              scope,
              metric: 'threeDartAverage',
              metricLabel: '3-dart average',
              scopeLabel: stats.label,
            })
          }}
        />
        {isOneTwentyOne && stats.avgCheckoutsPerGame !== null && (
          <StatCard
            label="Avg checkouts / game"
            value={formatAverage(stats.avgCheckoutsPerGame)}
            onClick={() => {
              onStatSelect({
                scope,
                metric: 'avgCheckoutsPerGame',
                metricLabel: 'Checkouts / game',
                scopeLabel: stats.label,
              })
            }}
          />
        )}
        {isOneTwentyOne && stats.bestCheckoutsPerGame !== null && (
          <StatCard
            label="Best checkouts / game"
            value={formatInteger(stats.bestCheckoutsPerGame)}
            onClick={() => {
              onStatSelect({
                scope,
                metric: 'bestCheckoutsPerGame',
                metricLabel: 'Checkouts / game',
                scopeLabel: stats.label,
              })
            }}
          />
        )}
        {isOneTwentyOne && stats.highestCheckout !== null && (
          <StatCard
            label="Highest target"
            value={formatInteger(stats.highestCheckout)}
            onClick={() => {
              onStatSelect({
                scope,
                metric: 'highestCheckout',
                metricLabel: 'Highest target',
                scopeLabel: stats.label,
              })
            }}
          />
        )}
      </SimpleGrid>
    </PracticeModeCard>
  )
}

export const Bob27PracticeCard = ({
  stats,
  onStatSelect,
}: {
  stats: Bob27PracticeStats
  onStatSelect: (selection: StatTimelineSelection) => void
}) => (
  <PracticeModeCard title={stats.label} trailing={<StatsCountLabel count={stats.gameCount} />}>
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      <StatCard
        label="Hit rate"
        value={formatPercent(stats.hitRate)}
        onClick={() => {
          onStatSelect({
            scope: { type: 'practice-bob27' },
            metric: 'hitRate',
            metricLabel: 'Hit rate',
            scopeLabel: stats.label,
          })
        }}
      />
      {stats.avgHitsPerVisit !== null && (
        <StatCard
          label="Avg / visit"
          value={formatAverage(stats.avgHitsPerVisit)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-bob27' },
              metric: 'avgHitsPerVisit',
              metricLabel: 'Avg / visit',
              scopeLabel: stats.label,
            })
          }}
        />
      )}
      {stats.avgDoublesPerGame !== null && (
        <StatCard
          label="Avg doubles / game"
          value={formatAverage(stats.avgDoublesPerGame)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-bob27' },
              metric: 'avgDoublesPerGame',
              metricLabel: 'Doubles / game',
              scopeLabel: stats.label,
            })
          }}
        />
      )}
      {stats.bestDoublesPerGame !== null && (
        <StatCard
          label="Best doubles / game"
          value={formatInteger(stats.bestDoublesPerGame)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-bob27' },
              metric: 'bestDoublesPerGame',
              metricLabel: 'Doubles / game',
              scopeLabel: stats.label,
            })
          }}
        />
      )}
      {stats.avgFinalScore !== null && (
        <StatCard
          label="Avg final score"
          value={formatInteger(stats.avgFinalScore)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-bob27' },
              metric: 'avgFinalScore',
              metricLabel: 'Final score',
              scopeLabel: stats.label,
            })
          }}
        />
      )}
      {stats.bestFinalScore !== null && (
        <StatCard
          label="Best final score"
          value={formatInteger(stats.bestFinalScore)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-bob27' },
              metric: 'bestFinalScore',
              metricLabel: 'Final score',
              scopeLabel: stats.label,
            })
          }}
        />
      )}
    </SimpleGrid>
  </PracticeModeCard>
)

export const AroundTheClockPracticeCard = ({
  variants,
  onStatSelect,
}: {
  variants: AroundTheClockPracticeStats[]
  onStatSelect: (selection: StatTimelineSelection) => void
}) => {
  const { selectedKey, setSelectedKey, selected } = useLastPlayedVariantSelection(
    variants,
    getAroundTheClockVariantKey,
    getAroundTheClockLastPlayedAt,
  )

  if (selected === undefined) {
    return null
  }

  const scopeLabel = `${gameModeDefinitions[GameModeId.AroundTheClock].label} · ${getAroundTheClockAimModeLabel(selected.aimMode)}`

  return (
    <PracticeModeCard
      title={gameModeDefinitions[GameModeId.AroundTheClock].label}
      trailing={
        <StatsVariantToggle
          items={variants.map((stats) => ({
            value: stats.aimMode,
            label: getAroundTheClockAimModeLabel(stats.aimMode),
            count: stats.gameCount,
          }))}
          value={selectedKey}
          onChange={setSelectedKey}
        />
      }
    >
      <Stack gap={3}>
        <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
          <StatCard
            label="Completion rate"
            value={formatPercent(selected.completionRate)}
            onClick={() => {
              onStatSelect({
                scope: { type: 'practice-around-the-clock', aimMode: selected.aimMode },
                metric: 'completionRate',
                metricLabel: 'Completion rate',
                scopeLabel,
              })
            }}
          />
          <StatCard
            label="Avg darts"
            value={formatCount(selected.avgDartsFullRun)}
            detail={
              selected.avgDartsPerField === null
                ? undefined
                : `${formatCount(selected.avgDartsPerField)} per field`
            }
            onClick={() => {
              onStatSelect({
                scope: { type: 'practice-around-the-clock', aimMode: selected.aimMode },
                metric: 'avgDarts',
                metricLabel: 'Darts',
                scopeLabel,
              })
            }}
          />
          <StatCard
            label="Best darts"
            value={formatInteger(selected.bestDartsFullRun)}
            detail={
              selected.bestDartsPerField === null
                ? undefined
                : `${formatCount(selected.bestDartsPerField)} per field`
            }
            onClick={() => {
              onStatSelect({
                scope: { type: 'practice-around-the-clock', aimMode: selected.aimMode },
                metric: 'bestDarts',
                metricLabel: 'Darts',
                scopeLabel,
              })
            }}
          />
        </SimpleGrid>
        <AroundTheClockHeatmap targets={selected.targets} />
      </Stack>
    </PracticeModeCard>
  )
}
