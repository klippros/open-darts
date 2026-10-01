import { Box, HStack, Stack, Text } from '@chakra-ui/react'
import type { ScoreboardPlayerEntry } from '@open-darts/game/game/GameEngine'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { Visit } from '@open-darts/game/types/visit'
import { getHunterStandingFieldNumber } from '@open-darts/game/hunter/hunterClock'
import { formatCount, formatPercent } from '../../lib/analytics/formatAnalytics'
import { computeHunterPlayerStats } from '../../lib/hunter/hunterVisitStats'

export interface HunterPlayerSideStatsProps {
  player: ScoreboardPlayerEntry
  color: string
  visits: Visit[]
  /** Pending darts for the active player — included in live hit%/advance stats. */
  pendingDarts?: DartThrow[]
  align: 'start' | 'end'
}

export const HunterPlayerSideStats = ({
  player,
  color,
  visits,
  pendingDarts = [],
  align,
}: HunterPlayerSideStatsProps) => {
  const stats = computeHunterPlayerStats(
    visits,
    player.playerId,
    player.isActive ? pendingDarts : [],
  )
  // Scoreboard preview already applies pending; primaryScore is the live aim.
  const aimFieldNumber = player.primaryScore
  const standingFieldNumber = getHunterStandingFieldNumber(aimFieldNumber)
  const textAlign = align === 'start' ? 'left' : 'right'

  return (
    <Stack
      gap={1}
      flex="1 1 0"
      minW={0}
      w={{ base: 'auto', sm: '120px' }}
      flexGrow={{ base: 1, sm: 0 }}
      flexShrink={{ base: 1, sm: 0 }}
      flexBasis={{ base: 0, sm: '120px' }}
      opacity={player.isActive ? 1 : 0.65}
      textAlign={textAlign}
      align={align === 'start' ? 'flex-start' : 'flex-end'}
    >
      <HStack gap={2} flexDirection={align === 'end' ? 'row-reverse' : 'row'}>
        <Box w="10px" h="10px" borderRadius="full" bg={color} flexShrink={0} />
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={player.isActive ? color : 'white'}
          truncate
          maxW="100%"
        >
          {player.name}
        </Text>
      </HStack>
      <Text fontSize="xs" color="whiteAlpha.700">
        On {standingFieldNumber} · hit {aimFieldNumber}
      </Text>
      <Text fontSize="xs" color="whiteAlpha.800">
        Hit {formatPercent(stats.hitRate)}
      </Text>
      <Text fontSize="xs" color="whiteAlpha.800">
        {formatCount(stats.avgAdvancesPerVisit)} adv/visit
      </Text>
    </Stack>
  )
}
