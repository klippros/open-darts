import { Box, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import { LegWinDots } from './LegWinDots'

export type PlayerScorePanelAlign = 'left' | 'right' | 'solo'

const getPanelAlign = (isSolo: boolean, index: number): PlayerScorePanelAlign => {
  if (isSolo) {
    return 'solo'
  }

  return index === 0 ? 'left' : 'right'
}

export interface PlayerScorePanelProps {
  player: ScoreboardPlayerEntry
  visitAverage: number | null
  isSolo: boolean
  panelAlign: PlayerScorePanelAlign
  legsToWin?: number
  legsWon?: number
}

const formatAverage = (average: number | null): string => {
  if (average === null) {
    return '∅ —'
  }

  return `∅ ${average.toFixed(1)}`
}

const PlayerScorePanelHeader = ({
  player,
  panelAlign,
  legsToWin,
  legsWon,
}: Pick<PlayerScorePanelProps, 'player' | 'panelAlign' | 'legsToWin' | 'legsWon'>) => {
  const showLegDots = legsToWin !== undefined && legsWon !== undefined

  if (panelAlign === 'solo') {
    if (!showLegDots) {
      return null
    }

    return (
      <Grid templateColumns="1fr auto 1fr" alignItems="center" mb={1} minH="5">
        <Box />
        <LegWinDots legsToWin={legsToWin} legsWon={legsWon} isSolo />
        <Box />
      </Grid>
    )
  }

  if (!showLegDots) {
    return (
      <Flex mb={1} minH="5" justify={panelAlign === 'right' ? 'flex-end' : 'flex-start'}>
        <Text fontSize="sm" color="whiteAlpha.600">
          {player.name}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex align="center" justify="space-between" mb={1} minH="5" gap={2}>
      {panelAlign === 'left' ? (
        <>
          <Text fontSize="sm" color="whiteAlpha.600">
            {player.name}
          </Text>
          <LegWinDots legsToWin={legsToWin} legsWon={legsWon} />
        </>
      ) : (
        <>
          <LegWinDots legsToWin={legsToWin} legsWon={legsWon} />
          <Text fontSize="sm" color="whiteAlpha.600">
            {player.name}
          </Text>
        </>
      )}
    </Flex>
  )
}

export const PlayerScorePanel = ({
  player,
  visitAverage,
  isSolo,
  panelAlign,
  legsToWin,
  legsWon,
}: PlayerScorePanelProps) => (
  <Box
    px={5}
    py={4}
    borderRadius="16px"
    borderWidth="1px"
    borderColor={player.isActive ? 'whiteAlpha.500' : 'whiteAlpha.200'}
    bg={player.isActive ? 'whiteAlpha.100' : 'whiteAlpha.50'}
    gridColumn={isSolo ? '1 / -1' : undefined}
  >
    <PlayerScorePanelHeader
      player={player}
      panelAlign={panelAlign}
      legsToWin={legsToWin}
      legsWon={legsWon}
    />
    <Heading
      size="5xl"
      color="white"
      fontFamily="Archivo Black, sans-serif"
      lineHeight="1"
      textAlign="center"
    >
      {player.primaryScore}
    </Heading>
    <Text mt={2} fontSize="sm" color="whiteAlpha.600" textAlign="center">
      {player.secondaryLabel ?? formatAverage(visitAverage)}
    </Text>
  </Box>
)

export interface PlayerScorePanelsProps {
  players: ScoreboardPlayerEntry[]
  visitAverages: Record<string, number | null>
  legsToWin?: number
  legWins?: Record<string, number>
}

export const PlayerScorePanels = ({
  players,
  visitAverages,
  legsToWin,
  legWins,
}: PlayerScorePanelsProps) => {
  const isSolo = players.length === 1
  const showLegDots = legsToWin !== undefined && legWins !== undefined

  return (
    <Grid templateColumns={isSolo ? '1fr' : 'repeat(2, 1fr)'} gap={3}>
      {players.map((player, index) => (
          <PlayerScorePanel
            key={player.playerId}
            player={player}
            visitAverage={visitAverages[player.playerId] ?? null}
            isSolo={isSolo}
            panelAlign={getPanelAlign(isSolo, index)}
            legsToWin={showLegDots ? legsToWin : undefined}
            legsWon={showLegDots ? (legWins[player.playerId] ?? 0) : undefined}
          />
        ))}
    </Grid>
  )
}
