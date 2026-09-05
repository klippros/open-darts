import { SimpleGrid } from '@chakra-ui/react'
import { formatAverage, formatInteger } from '../../lib/analytics/formatAnalytics'
import { computeOneTwentyOneSingleSessionStats } from '../../lib/oneTwentyOne/oneTwentyOneVisitStats'
import type { GameSession } from '../../types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface OneTwentyOneSummaryPanelProps {
  session: GameSession
}

export const OneTwentyOneSummaryPanel = ({ session }: OneTwentyOneSummaryPanelProps) => {
  const stats = computeOneTwentyOneSingleSessionStats(session)

  if (stats === null) {
    return null
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      <StatCard
        label="Checkouts"
        value={formatInteger(stats.checkouts)}
        detail={`${stats.visitCount} visit${stats.visitCount === 1 ? '' : 's'}`}
      />
      <StatCard label="3-dart average" value={formatAverage(stats.threeDartAverage)} />
      {stats.peakTarget !== null && (
        <StatCard label="Peak" value={formatInteger(stats.peakTarget)} />
      )}
    </SimpleGrid>
  )
}
