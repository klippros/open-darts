import { Box, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { getCheckoutPathLabel } from '@open-darts/game/checkout/checkoutSuggestions'
import type { ScoreboardPlayerEntry } from '@open-darts/game/game/GameEngine'
import type { CheckoutRules } from '@open-darts/game/types/checkout'
import type { ChallengeLegStatus } from '@open-darts/game/types/match'
import type { DoubleCheckoutStats } from '@open-darts/analytics/doubleCheckoutStats'
import { LegStarterIcon } from '../LegStarterIcon/LegStarterIcon'
import { ChallengeLegDots } from './ChallengeLegDots'
import { LegWinDots } from './LegWinDots'
import { OneTwentyOneLives } from './OneTwentyOneLives'
import { ScoreMetricRow } from './ScoreMetricRow'
import type { ChallengeScoreDetails, ScoreMetric } from './scoreMetrics'
import { buildAverageScoreMetrics, scoreMetricsFromSecondaryLabel } from './scoreMetrics'

export type PlayerScorePanelAlign = 'left' | 'right' | 'solo'

export type ScoreboardDisplayPlayer = ScoreboardPlayerEntry & {
  secondaryMetrics?: ScoreMetric[]
}

const getPanelAlign = (isSolo: boolean, index: number): PlayerScorePanelAlign => {
  if (isSolo) {
    return 'solo'
  }

  return index === 0 ? 'left' : 'right'
}

export interface PlayerScorePanelProps {
  player: ScoreboardDisplayPlayer
  legAverage: number | null
  matchAverage: number | null
  currentLeg?: number
  isSolo: boolean
  panelAlign: PlayerScorePanelAlign
  legsToWin?: number
  legsWon?: number
  challengeLegStatuses?: ChallengeLegStatus[]
  challengeScoreDetails?: ChallengeScoreDetails
  isLegStarter?: boolean
  checkoutRules?: CheckoutRules | null
  matchCheckout?: DoubleCheckoutStats
}

const resolveScoreMetrics = ({
  player,
  legAverage,
  matchAverage,
  currentLeg,
  challengeScoreDetails,
  matchCheckout,
}: Pick<
  PlayerScorePanelProps,
  | 'player'
  | 'legAverage'
  | 'matchAverage'
  | 'currentLeg'
  | 'challengeScoreDetails'
  | 'matchCheckout'
>): ScoreMetric[] | undefined => {
  if (player.secondaryMetrics !== undefined) {
    return player.secondaryMetrics
  }

  if (player.secondaryLabel !== undefined) {
    return scoreMetricsFromSecondaryLabel(player.secondaryLabel)
  }

  if (
    challengeScoreDetails !== undefined ||
    legAverage !== null ||
    matchAverage !== null ||
    currentLeg !== undefined ||
    matchCheckout !== undefined
  ) {
    return buildAverageScoreMetrics({
      legAverage,
      matchAverage,
      currentLeg,
      challengeScoreDetails,
      checkout: matchCheckout,
    })
  }

  return undefined
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
  <Flex align="center" gap={1} minW={0}>
    {nameFirst ? (
      <>
        <Text fontSize="sm" color="whiteAlpha.600" truncate>
          {name}
        </Text>
        {isLegStarter && <LegStarterIcon direction="left" />}
      </>
    ) : (
      <>
        {isLegStarter && <LegStarterIcon direction="right" />}
        <Text fontSize="sm" color="whiteAlpha.600" truncate>
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
  challengeLegStatuses,
  isLegStarter = false,
}: Pick<
  PlayerScorePanelProps,
  'player' | 'panelAlign' | 'legsToWin' | 'legsWon' | 'challengeLegStatuses' | 'isLegStarter'
>) => {
  const showLegDots =
    legsToWin !== undefined && legsWon !== undefined && challengeLegStatuses === undefined
  const showChallengeLegDots = challengeLegStatuses !== undefined && challengeLegStatuses.length > 0
  const showOneTwentyOneLives = player.lives !== undefined

  if (panelAlign === 'solo') {
    if (showOneTwentyOneLives) {
      return (
        <Grid templateColumns="1fr auto 1fr" alignItems="center" minH="5">
          <Box />
          <OneTwentyOneLives lives={player.lives ?? 0} />
          <Box />
        </Grid>
      )
    }

    if (showChallengeLegDots) {
      return (
        <Grid templateColumns="1fr auto 1fr" alignItems="center" minH="5">
          <Box />
          <ChallengeLegDots legStatuses={challengeLegStatuses} />
          <Box />
        </Grid>
      )
    }

    if (!showLegDots) {
      return null
    }

    return (
      <Grid templateColumns="1fr auto 1fr" alignItems="center" minH="5">
        <Box />
        <LegWinDots legsToWin={legsToWin} legsWon={legsWon} isSolo />
        <Box />
      </Grid>
    )
  }

  if (!showLegDots) {
    return (
      <Flex minH="5" justify={panelAlign === 'right' ? 'flex-end' : 'flex-start'}>
        <PlayerNameWithLegStarter
          name={player.name}
          isLegStarter={isLegStarter}
          nameFirst={panelAlign === 'left'}
        />
      </Flex>
    )
  }

  return (
    <Flex align="center" justify="space-between" minH="5" gap={2}>
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
  challengeLegStatuses,
  challengeScoreDetails,
  isLegStarter = false,
  checkoutRules = null,
  matchCheckout,
}: PlayerScorePanelProps) => {
  const checkoutPathLabel =
    checkoutRules === null ? null : getCheckoutPathLabel(player.primaryScore, checkoutRules)
  const scoreMetrics = resolveScoreMetrics({
    player,
    legAverage,
    matchAverage,
    currentLeg,
    challengeScoreDetails,
    matchCheckout,
  })

  return (
    <Box
      px={5}
      py={4}
      borderRadius="16px"
      borderWidth="1px"
      borderColor={player.isActive ? 'whiteAlpha.500' : 'whiteAlpha.200'}
      bg={player.isActive ? 'whiteAlpha.100' : 'whiteAlpha.50'}
      minW={0}
      w="full"
      gridColumn={isSolo ? '1 / -1' : undefined}
    >
      <Stack gap={3}>
        <PlayerScorePanelHeader
          player={player}
          panelAlign={panelAlign}
          legsToWin={legsToWin}
          legsWon={legsWon}
          challengeLegStatuses={challengeLegStatuses}
          isLegStarter={isLegStarter}
        />
        <Heading
          size="5xl"
          color="white"
          fontFamily="Archivo Black, sans-serif"
          lineHeight="1"
          textAlign="center"
        >
          {player.primaryDisplay ?? player.primaryScore}
        </Heading>
        {scoreMetrics !== undefined && scoreMetrics.length > 0 && (
          <ScoreMetricRow metrics={scoreMetrics} />
        )}
        {checkoutPathLabel !== null && (
          <Text
            color="whiteAlpha.800"
            fontFamily="Archivo Black, sans-serif"
            fontSize="lg"
            lineHeight="1"
            textAlign="center"
            aria-label={`Checkout ${checkoutPathLabel}`}
          >
            {checkoutPathLabel}
          </Text>
        )}
      </Stack>
    </Box>
  )
}

export interface PlayerScorePanelsProps {
  players: ScoreboardDisplayPlayer[]
  legAndMatchAverages: Record<string, { leg: number | null; match: number | null }>
  currentLeg?: number
  legsToWin?: number
  legWins?: Record<string, number>
  legLosses?: number
  challengeLegStatuses?: ChallengeLegStatus[]
  challengeScoreDetails?: ChallengeScoreDetails
  legStartingPlayerIndex?: number
  checkoutRules?: CheckoutRules | null
  matchCheckoutByPlayer?: Record<string, DoubleCheckoutStats>
}

export const PlayerScorePanels = ({
  players,
  legAndMatchAverages,
  currentLeg,
  legsToWin,
  legWins,
  challengeLegStatuses,
  challengeScoreDetails,
  legStartingPlayerIndex,
  checkoutRules = null,
  matchCheckoutByPlayer,
}: PlayerScorePanelsProps) => {
  const isSolo = players.length === 1
  const showLegDots =
    legsToWin !== undefined && legWins !== undefined && challengeLegStatuses === undefined

  return (
    <Grid templateColumns={isSolo ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))'} gap={3}>
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
            challengeLegStatuses={challengeLegStatuses}
            challengeScoreDetails={challengeScoreDetails}
            isLegStarter={!isSolo && legStartingPlayerIndex === index}
            checkoutRules={checkoutRules}
            matchCheckout={matchCheckoutByPlayer?.[player.playerId]}
          />
        )
      })}
    </Grid>
  )
}
