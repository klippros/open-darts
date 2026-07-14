import type { ReactNode } from 'react'
import { Box, Grid, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type {
  CheckoutPracticeStats,
  OtherPracticeStats,
} from '../../lib/analytics/computeAnalytics'
import {
  isAroundTheClockPracticeStats,
  isBob27PracticeStats,
} from '../../lib/analytics/practiceStats'
import type { AroundTheClockPerTargetStats } from '../../lib/analytics/aroundTheClockStats'
import type { StatTimelineSelection } from '../../lib/analytics/statTimelines'
import {
  formatAverage,
  formatCount,
  formatInteger,
  formatPercent,
} from '../../lib/analytics/formatAnalytics'
import { StatCard } from './StatCard'

const PracticeModeCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={5}
    py={4}
  >
    <Stack gap={3}>
      <Text fontWeight="semibold" color="white">
        {title}
      </Text>
      {children}
    </Stack>
  </Box>
)

export const CheckoutPracticeCard = ({
  stats,
  onStatSelect,
}: {
  stats: CheckoutPracticeStats
  onStatSelect: (selection: StatTimelineSelection) => void
}) => {
  const scope = { type: 'practice-checkout' as const, mode: stats.mode }

  return (
    <PracticeModeCard title={stats.label}>
      <Text fontSize="sm" color="whiteAlpha.700">
        {stats.gameCount} session{stats.gameCount === 1 ? '' : 's'} · {stats.visitCount} checkout
        attempt{stats.visitCount === 1 ? '' : 's'}
      </Text>
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
      </SimpleGrid>
    </PracticeModeCard>
  )
}

const AroundTheClockTargetTable = ({ targets }: { targets: AroundTheClockPerTargetStats[] }) => {
  const targetsWithData = targets.filter((target) => target.attemptCount > 0)

  if (targetsWithData.length === 0) {
    return null
  }

  const gridTemplateColumns = 'minmax(4rem, 0.8fr) repeat(3, minmax(0, 1fr))'

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      overflow="hidden"
    >
      <Stack gap={0}>
        <Grid templateColumns={gridTemplateColumns} px={4} py={2} columnGap={3}>
          <Text fontSize="sm" color="whiteAlpha.700">
            Target
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" textAlign="right">
            Avg darts
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" textAlign="right">
            Best
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" textAlign="right">
            Attempts
          </Text>
        </Grid>

        {targetsWithData.map((target) => (
          <Grid
            key={target.targetIndex}
            templateColumns={gridTemplateColumns}
            px={4}
            py={2.5}
            columnGap={3}
            borderTopWidth="1px"
            borderColor="whiteAlpha.100"
          >
            <Text fontSize="sm" color="whiteAlpha.700" alignSelf="center">
              {target.label}
            </Text>
            <Text fontSize="sm" color="whiteAlpha.900" textAlign="right" alignSelf="center">
              {formatCount(target.avgDartsPerHit)}
            </Text>
            <Text fontSize="sm" color="whiteAlpha.900" textAlign="right" alignSelf="center">
              {formatInteger(target.bestDarts)}
            </Text>
            <Text fontSize="sm" color="whiteAlpha.900" textAlign="right" alignSelf="center">
              {target.attemptCount}
            </Text>
          </Grid>
        ))}
      </Stack>
    </Box>
  )
}

export const OtherPracticeCard = ({
  stats,
  onStatSelect,
}: {
  stats: OtherPracticeStats
  onStatSelect: (selection: StatTimelineSelection) => void
}) => (
  <PracticeModeCard title={stats.label}>
    <Text fontSize="sm" color="whiteAlpha.700">
      {stats.gameCount} session{stats.gameCount === 1 ? '' : 's'} · {stats.completedCount} completed
    </Text>
    {isBob27PracticeStats(stats) && (
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
        <StatCard
          label="Avg visits"
          value={formatCount(stats.avgVisits)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-bob27' },
              metric: 'avgVisits',
              metricLabel: 'Visits',
              scopeLabel: stats.label,
            })
          }}
        />
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
      </SimpleGrid>
    )}
    {isAroundTheClockPracticeStats(stats) && (
      <Stack gap={3}>
        <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
          <StatCard
            label="Completion rate"
            value={formatPercent(stats.completionRate)}
            onClick={() => {
              onStatSelect({
                scope: { type: 'practice-around-the-clock', aimMode: stats.aimMode },
                metric: 'completionRate',
                metricLabel: 'Completion rate',
                scopeLabel: stats.label,
              })
            }}
          />
          <StatCard
            label="Avg darts"
            value={formatCount(stats.avgDartsFullRun)}
            detail={
              stats.avgDartsPerField === null
                ? undefined
                : `${formatCount(stats.avgDartsPerField)} per field`
            }
            onClick={() => {
              onStatSelect({
                scope: { type: 'practice-around-the-clock', aimMode: stats.aimMode },
                metric: 'avgDarts',
                metricLabel: 'Darts',
                scopeLabel: stats.label,
              })
            }}
          />
          <StatCard
            label="Best darts"
            value={formatInteger(stats.bestDartsFullRun)}
            detail={
              stats.bestDartsPerField === null
                ? undefined
                : `${formatCount(stats.bestDartsPerField)} per field`
            }
            onClick={() => {
              onStatSelect({
                scope: { type: 'practice-around-the-clock', aimMode: stats.aimMode },
                metric: 'bestDarts',
                metricLabel: 'Darts',
                scopeLabel: stats.label,
              })
            }}
          />
        </SimpleGrid>
        <AroundTheClockTargetTable targets={stats.targets} />
      </Stack>
    )}
  </PracticeModeCard>
)
