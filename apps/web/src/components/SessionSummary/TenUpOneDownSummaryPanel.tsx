import { SimpleGrid } from '@chakra-ui/react'
import { formatInteger, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeTenUpOneDownSingleSessionStats } from '../../lib/tenUpOneDown/tenUpOneDownVisitStats'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface TenUpOneDownSummaryPanelProps {
  session: GameSession
}

export const TenUpOneDownSummaryPanel = ({ session }: TenUpOneDownSummaryPanelProps) => {
  const stats = computeTenUpOneDownSingleSessionStats(session)

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
      {stats.checkoutRate !== null && (
        <StatCard label="Checkout rate" value={formatPercent(stats.checkoutRate)} />
      )}
      {stats.highestCheckout !== null && (
        <StatCard label="Highest checkout" value={formatInteger(stats.highestCheckout)} />
      )}
    </SimpleGrid>
  )
}
