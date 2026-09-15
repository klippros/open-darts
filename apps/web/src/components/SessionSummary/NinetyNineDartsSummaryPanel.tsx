import { SimpleGrid } from '@chakra-ui/react'
import { formatInteger, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeNinetyNineDartsSingleSessionStats } from '../../lib/ninetyNineDarts/ninetyNineVisitStats'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface NinetyNineDartsSummaryPanelProps {
  session: GameSession
}

export const NinetyNineDartsSummaryPanel = ({ session }: NinetyNineDartsSummaryPanelProps) => {
  const stats = computeNinetyNineDartsSingleSessionStats(session)

  if (stats === null) {
    return null
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      <StatCard
        label="Score"
        value={stats.score === null ? '—' : formatInteger(stats.score)}
        detail={`Target ${stats.targetLabel}`}
      />
      <StatCard label="Hit rate" value={formatPercent(stats.hitRate)} />
      <StatCard label="Singles" value={formatInteger(stats.counts.singles)} />
      <StatCard label="Doubles" value={formatInteger(stats.counts.doubles)} />
      {!stats.isBull && <StatCard label="Trebles" value={formatInteger(stats.counts.trebles)} />}
      <StatCard
        label="Misses"
        value={formatInteger(stats.counts.misses)}
        detail={`${stats.dartsThrown} dart${stats.dartsThrown === 1 ? '' : 's'}`}
      />
    </SimpleGrid>
  )
}
