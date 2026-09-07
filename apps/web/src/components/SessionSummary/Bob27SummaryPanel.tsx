import { SimpleGrid } from '@chakra-ui/react'
import { formatAverage, formatInteger, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeBob27SingleSessionStats } from '../../lib/bob27/bob27VisitStats'
import type { GameSession } from '../../types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface Bob27SummaryPanelProps {
  session: GameSession
}

export const Bob27SummaryPanel = ({ session }: Bob27SummaryPanelProps) => {
  const stats = computeBob27SingleSessionStats(session)

  if (stats === null) {
    return null
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      <StatCard
        label="Doubles hit"
        value={formatInteger(stats.doublesHit)}
        detail={`${stats.visitCount} visit${stats.visitCount === 1 ? '' : 's'}`}
      />
      <StatCard label="Avg / visit" value={formatAverage(stats.avgHitsPerVisit)} />
      <StatCard label="Hit rate" value={formatPercent(stats.hitRate)} />
      {stats.finalScore !== null && (
        <StatCard label="Final score" value={formatInteger(stats.finalScore)} />
      )}
    </SimpleGrid>
  )
}
