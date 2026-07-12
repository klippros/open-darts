import { Box, Flex, Grid, Heading, Text } from '@chakra-ui/react'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import { LegStarterIcon } from '../LegStarterIcon/LegStarterIcon'
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
  legAverage: number | null
  matchAverage: number | null
  currentLeg?: number
  isSolo: boolean
  panelAlign: PlayerScorePanelAlign
  legsToWin?: number
  legsWon?: number
  isLegStarter?: boolean
}

const formatLegAverage = (average: number | null): string =>
  average === null ? '∅ —' : `∅ ${average.toFixed(1)}`

const formatMatchAverage = (average: number | null): string =>
  average === null ? '—' : average.toFixed(1)

const formatAveragesDisplay = (
  legAverage: number | null,
  matchAverage: number | null,
  currentLeg?: number,
): string => {
  if (currentLeg === undefined || currentLeg < 2) {
    return formatLegAverage(legAverage)
  }

  return `${formatLegAverage(legAverage)} / ${formatMatchAverage(matchAverage)}`
}

const PlayerNameWithLegStarter = ({
  name,
  isLegStarter,
  nameFirst,
}: {
  name: string
  isLegStarter: boolean
  nameFirst: boolean
}) => (
  <Flex align="center" gap={1}>
    {nameFirst ? (
      <>
        <Text fontSize="sm" color="whiteAlpha.600">
          {name}
        </Text>
        {isLegStarter && <LegStarterIcon direction="left" />}
      </>
    ) : (
      <>
        {isLegStarter && <LegStarterIcon direction="right" />}
        <Text fontSize="sm" color="whiteAlpha.600">
          {name}
        </Text>
      </>
    )}
  </Flex>
)

const PlayerScorePanelHeader = ({
  player,
  panelAlign,
  legsToWin,
  legsWon,
  isLegStarter = false,
}: Pick<
  PlayerScorePanelProps,
  'player' | 'panelAlign' | 'legsToWin' | 'legsWon' | 'isLegStarter'
>) => {
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
        <PlayerNameWithLegStarter
          name={player.name}
          isLegStarter={isLegStarter}
          nameFirst={panelAlign === 'left'}
        />
      </Flex>
    )
  }

  return (
    <Flex align="center" justify="space-between" mb={1} minH="5" gap={2}>
      {panelAlign === 'left' ? (
        <>
          <PlayerNameWithLegStarter name={player.name} isLegStarter={isLegStarter} nameFirst />
          <LegWinDots legsToWin={legsToWin} legsWon={legsWon} reverseOrder />
        </>
      ) : (
        <>
          <LegWinDots legsToWin={legsToWin} legsWon={legsWon} />
          <PlayerNameWithLegStarter
            name={player.name}
            isLegStarter={isLegStarter}
            nameFirst={false}
          />
        </>
      )}
    </Flex>
  )
}

export const PlayerScorePanel = ({
  player,
  legAverage,
  matchAverage,
  currentLeg,
  isSolo,
  panelAlign,
  legsToWin,
  legsWon,
  isLegStarter = false,
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
      isLegStarter={isLegStarter}
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
      {player.secondaryLabel ?? formatAveragesDisplay(legAverage, matchAverage, currentLeg)}
    </Text>
  </Box>
)

export interface PlayerScorePanelsProps {
  players: ScoreboardPlayerEntry[]
  legAndMatchAverages: Record<string, { leg: number | null; match: number | null }>
  currentLeg?: number
  legsToWin?: number
  legWins?: Record<string, number>
  legStartingPlayerIndex?: number
}

export const PlayerScorePanels = ({
  players,
  legAndMatchAverages,
  currentLeg,
  legsToWin,
  legWins,
  legStartingPlayerIndex,
}: PlayerScorePanelsProps) => {
  const isSolo = players.length === 1
  const showLegDots = legsToWin !== undefined && legWins !== undefined

  return (
    <Grid templateColumns={isSolo ? '1fr' : 'repeat(2, 1fr)'} gap={3}>
      {players.map((player, index) => {
        const averages = legAndMatchAverages[player.playerId] ?? { leg: null, match: null }

        return (
          <PlayerScorePanel
            key={player.playerId}
            player={player}
            legAverage={averages.leg}
            matchAverage={averages.match}
            currentLeg={currentLeg}
            isSolo={isSolo}
            panelAlign={getPanelAlign(isSolo, index)}
            legsToWin={showLegDots ? legsToWin : undefined}
            legsWon={showLegDots ? (legWins[player.playerId] ?? 0) : undefined}
            isLegStarter={!isSolo && legStartingPlayerIndex === index}
          />
        )
      })}
    </Grid>
  )
}
