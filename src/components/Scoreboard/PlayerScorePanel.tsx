import { Box, Grid, Heading, Text } from '@chakra-ui/react'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'

export interface PlayerScorePanelProps {
  player: ScoreboardPlayerEntry
  visitAverage: number | null
  isSolo: boolean
}

const formatAverage = (average: number | null): string => {
  if (average === null) {
    return 'Avg —'
  }

  return `Avg ${average.toFixed(1)}`
}

export const PlayerScorePanel = ({ player, visitAverage, isSolo }: PlayerScorePanelProps) => (
  <Box
    px={5}
    py={4}
    borderRadius="16px"
    borderWidth="1px"
    borderColor={player.isActive ? 'whiteAlpha.500' : 'whiteAlpha.200'}
    bg={player.isActive ? 'whiteAlpha.100' : 'whiteAlpha.50'}
    gridColumn={isSolo ? '1 / -1' : undefined}
  >
    <Text fontSize="sm" color="whiteAlpha.600" mb={1}>
      {player.name}
    </Text>
    <Heading size="3xl" color="white" fontFamily="Archivo Black, sans-serif" lineHeight="1">
      {player.primaryScore}
    </Heading>
    <Text mt={2} fontSize="sm" color="whiteAlpha.600">
      {formatAverage(visitAverage)}
    </Text>
  </Box>
)

export interface PlayerScorePanelsProps {
  players: ScoreboardPlayerEntry[]
  visitAverages: Record<string, number | null>
}

export const PlayerScorePanels = ({ players, visitAverages }: PlayerScorePanelsProps) => {
  const isSolo = players.length === 1

  return (
    <Grid templateColumns={isSolo ? '1fr' : 'repeat(2, 1fr)'} gap={3}>
      {players.map((player) => (
        <PlayerScorePanel
          key={player.playerId}
          player={player}
          visitAverage={visitAverages[player.playerId] ?? null}
          isSolo={isSolo}
        />
      ))}
    </Grid>
  )
}
