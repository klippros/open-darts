import type { ReactNode } from 'react'
import { Box, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type {
  CheckoutPracticeStats,
  OtherPracticeStats,
} from '../../lib/analytics/computeAnalytics'
import {
  isAroundTheClockPracticeStats,
  isBob27PracticeStats,
} from '../../lib/analytics/practiceStats'
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
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
        <StatCard
          label="Avg darts"
          value={formatCount(stats.avgDarts)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-around-the-clock' },
              metric: 'avgDarts',
              metricLabel: 'Darts',
              scopeLabel: stats.label,
            })
          }}
        />
        <StatCard
          label="Best darts"
          value={formatInteger(stats.bestDarts)}
          onClick={() => {
            onStatSelect({
              scope: { type: 'practice-around-the-clock' },
              metric: 'bestDarts',
              metricLabel: 'Darts',
              scopeLabel: stats.label,
            })
          }}
        />
      </SimpleGrid>
    )}
  </PracticeModeCard>
)
