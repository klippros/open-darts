import { SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { formatAverage, formatInteger, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeBullRunPlayerSessionStats } from '../../lib/bullRun/bullRunVisitStats'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { StatCard } from '../StatsPageSections/StatCard'

export interface BullRunSummaryPanelProps {
  session: GameSession
}

export const BullRunSummaryPanel = ({ session }: BullRunSummaryPanelProps) => {
  const playerStats = session.players
    .map((player) => {
      const stats = computeBullRunPlayerSessionStats(session, player.id)

      if (stats === null) {
        return null
      }

      return { player, stats }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  if (playerStats.length === 0) {
    return null
  }

  return (
    <Stack gap={4}>
      {playerStats.map(({ player, stats }) => (
        <Stack key={player.id} gap={2}>
          {playerStats.length > 1 && (
            <Text fontSize="sm" color="whiteAlpha.700" fontWeight="semibold">
              {player.name}
            </Text>
          )}
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
            <StatCard
              label="Score"
              value={stats.score === null ? '—' : formatInteger(stats.score)}
              detail={`Target ${stats.targetScore}`}
            />
            <StatCard label="Hit rate" value={formatPercent(stats.hitRate)} />
            <StatCard label="Singles / 3 darts" value={formatAverage(stats.singlesPerThreeDarts)} />
            <StatCard label="Doubles / 3 darts" value={formatAverage(stats.doublesPerThreeDarts)} />
            <StatCard
              label="3-dart avg"
              value={formatAverage(stats.avgPerThreeDarts)}
              detail={`${stats.dartsThrown} dart${stats.dartsThrown === 1 ? '' : 's'}`}
            />
          </SimpleGrid>
        </Stack>
      ))}
    </Stack>
  )
}
