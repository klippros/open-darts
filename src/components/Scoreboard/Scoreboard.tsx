import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { ScoreboardSnapshot } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import type { Visit } from '../../types/visit'

const multiplierPrefix = (multiplier: DartThrow['multiplier']): string => {
  if (multiplier === DartMultiplier.Double) {
    return 'D'
  }

  if (multiplier === DartMultiplier.Triple) {
    return 'T'
  }

  return ''
}

const formatDart = (dart: DartThrow): string => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return 'Miss'
  }

  if (dart.segment.type === DartSegmentType.OuterBull) {
    return '25'
  }

  if (dart.segment.type === DartSegmentType.Bull) {
    return 'Bull'
  }

  return `${multiplierPrefix(dart.multiplier)}${dart.segment.value}`
}

export interface ScoreboardProps {
  scoreboard: ScoreboardSnapshot
  pendingDarts: DartThrow[]
  visits: Visit[]
}

export const Scoreboard = ({ scoreboard, pendingDarts, visits }: ScoreboardProps) => {
  const activePlayer = scoreboard.players.find((player) => player.isActive)
  const lastVisit = visits.at(-1)

  return (
    <Stack gap={6}>
      <Box>
        <Text fontSize="sm" color="whiteAlpha.600" mb={1}>
          Remaining
        </Text>
        <Heading size="3xl" color="white" fontFamily="Archivo Black, sans-serif">
          {activePlayer?.primaryScore ?? 0}
        </Heading>
      </Box>

      <Stack gap={2}>
        <Text fontSize="sm" color="whiteAlpha.600">
          Current visit
        </Text>
        <Text color="white" fontSize="lg">
          {pendingDarts.length === 0
            ? 'No darts yet'
            : pendingDarts.map((dart) => formatDart(dart)).join(' · ')}
        </Text>
      </Stack>

      {lastVisit !== undefined && (
        <Stack gap={2}>
          <Text fontSize="sm" color="whiteAlpha.600">
            Last visit
          </Text>
          <Text color="whiteAlpha.800">
            {lastVisit.darts.map((dart) => formatDart(dart)).join(' · ')}
            {lastVisit.bust && ' (bust)'}
            {lastVisit.checkout && ' (checkout)'}
            {' -> '}
            {lastVisit.scoreAfter}
          </Text>
        </Stack>
      )}
    </Stack>
  )
}
