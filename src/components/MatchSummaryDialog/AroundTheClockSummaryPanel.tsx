import { SimpleGrid } from '@chakra-ui/react'
import { computeAroundTheClockSingleSessionStats } from '../../lib/analytics/aroundTheClockStats'
import { formatCount, formatInteger } from '../../lib/analytics/formatAnalytics'
import type { GameSession } from '../../types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface AroundTheClockSummaryPanelProps {
  session: GameSession
}

const formatPerFieldDetail = (value: number | null): string | undefined =>
  value === null ? undefined : `${formatCount(value)} per field`

export const AroundTheClockSummaryPanel = ({ session }: AroundTheClockSummaryPanelProps) => {
  const stats = computeAroundTheClockSingleSessionStats(session)

  if (stats === null) {
    return null
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      <StatCard
        label="Fields completed"
        value={`${stats.fieldsCompleted}/${stats.totalFields}`}
        detail={
          stats.isComplete
            ? 'Full run complete'
            : stats.currentTargetLabel === null
              ? undefined
              : `Stopped on ${stats.currentTargetLabel}`
        }
      />
      <StatCard
        label="Darts thrown"
        value={formatInteger(stats.dartsThrown)}
        detail={formatPerFieldDetail(stats.avgDartsPerField)}
      />
    </SimpleGrid>
  )
}
