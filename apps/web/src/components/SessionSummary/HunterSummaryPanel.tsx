import { SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { formatCount, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeHunterSingleSessionStats } from '../../lib/hunter/hunterVisitStats'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface HunterSummaryPanelProps {
  session: GameSession
}

export const HunterSummaryPanel = ({ session }: HunterSummaryPanelProps) => {
  const stats = computeHunterSingleSessionStats(session)

  if (stats === null) {
    return null
  }

  return (
    <Stack gap={4}>
      {stats.players.map((player) => (
        <Stack key={player.playerId} gap={2}>
          <Text fontSize="sm" color="whiteAlpha.700" fontWeight="semibold">
            {player.name}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
            <StatCard label="Hit rate" value={formatPercent(player.hitRate)} />
            <StatCard
              label="Avg advances / visit"
              value={formatCount(player.avgAdvancesPerVisit)}
              detail={`${player.visitCount} visit${player.visitCount === 1 ? '' : 's'}`}
            />
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  )
}
