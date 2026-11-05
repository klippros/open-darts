import { useMemo } from 'react'
import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '@open-darts/game/dartScoring'
import { getAroundTheClockLiveStats } from '../../lib/analytics/aroundTheClockStats'
import type { DoubleCheckoutStats } from '../../lib/analytics/doubleCheckoutStats'
import {
  getNinetyNineDartsLiveScoreMetrics,
  getNinetyNineDartsLiveStats,
} from '../../lib/ninetyNineDarts/ninetyNineVisitStats'
import {
  getBullRunLiveScoreMetrics,
  getBullRunLiveStats,
} from '../../lib/bullRun/bullRunVisitStats'
import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import type { ScoreboardPlayerEntry } from '@open-darts/game/game/GameEngine'
import {
  countPlayerVisitsInLeg,
  formatChallengeVisitProgressLabel,
  getChallengeLegStatuses,
  getChallengeVisitInProgress,
  getTargetThreeDartAverage,
  isChallengeMode,
  isChallengeVisitProgressOverLimit,
} from '@open-darts/game/game/challenge'
import {
  isAroundTheClockConfig,
  isNinetyNineDartsConfig,
  isOneTwentyOneConfig,
  isX01Config,
  toCheckoutSuggestionRules,
} from '@open-darts/game/game/gameConfigGuards'
import { getLegStartingPlayerIndex } from '@open-darts/game/game/matchLegs'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { MatchProgress } from '@open-darts/game/types/match'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { GameConfig, GameModeId as GameModeIdType } from '@open-darts/game/types/gameMode'
import type { Visit } from '@open-darts/game/types/visit'
import { NinetyNineDartsScorePanel } from './NinetyNineDartsScorePanel'
import type { ScoreboardDisplayPlayer } from './PlayerScorePanel'
import { PlayerScorePanels } from './PlayerScorePanel'
import type { ChallengeScoreDetails } from './scoreMetrics'
import { buildAroundTheClockScoreMetrics, buildVisitScoreMetric } from './scoreMetrics'
import { VisitDartSlots } from './VisitDartSlots'
import { HunterBoardPanel } from '../HunterBoard/HunterBoardPanel'

export interface ScoreboardCenterProps {
  mode: GameModeIdType
  players: ScoreboardPlayerEntry[]
  legAndMatchAverages: Record<string, { leg: number | null; match: number | null }>
  matchCheckoutByPlayer?: Record<string, DoubleCheckoutStats>
  activePlayer: ScoreboardPlayerEntry | undefined
  pendingDarts: DartThrow[]
  visits: Visit[]
  config: GameConfig
  matchProgress?: MatchProgress
  hideVisitDartSlots?: boolean
}

const buildChallengeScoreDetails = (
  visits: Visit[],
  matchProgress: MatchProgress,
  activePlayer: ScoreboardPlayerEntry,
  startScore: number,
): ChallengeScoreDetails | undefined => {
  const challenge = matchProgress.challenge

  if (challenge === undefined) {
    return undefined
  }

  const visitInProgress = getChallengeVisitInProgress(
    countPlayerVisitsInLeg(visits, matchProgress.currentLeg, activePlayer.playerId),
  )

  return {
    visitLabel: formatChallengeVisitProgressLabel(visitInProgress, challenge.maxVisits),
    visitOverLimit: isChallengeVisitProgressOverLimit(
      visitInProgress,
      challenge.maxVisits,
      activePlayer.primaryScore,
    ),
    targetAverage: getTargetThreeDartAverage(startScore, challenge.maxVisits),
  }
}

export const ScoreboardCenter = ({
  mode,
  players,
  legAndMatchAverages,
  matchCheckoutByPlayer,
  activePlayer,
  pendingDarts,
  visits,
  config,
  matchProgress,
  hideVisitDartSlots = false,
}: ScoreboardCenterProps) => {
  const checkoutRules = toCheckoutSuggestionRules(mode, config)
  const showVisitDartSlots =
    !hideVisitDartSlots &&
    mode !== GameModeId.AroundTheClock &&
    mode !== GameModeId.ClaimTheBoard &&
    mode !== GameModeId.Bob27 &&
    mode !== GameModeId.NinetyNineDarts &&
    mode !== GameModeId.Hunter &&
    mode !== GameModeId.BullRun
  const scoreBeforeVisit =
    activePlayer === undefined ? 0 : activePlayer.primaryScore + sumDartPoints(pendingDarts)
  const legStartingPlayerIndex =
    players.length === 2
      ? getLegStartingPlayerIndex(
          matchProgress?.startingPlayerIndex ?? 0,
          matchProgress?.currentLeg ?? 1,
          players.length,
        )
      : undefined

  const challengeLegStatuses = useMemo(() => {
    if (
      !isChallengeMode(matchProgress) ||
      activePlayer === undefined ||
      matchProgress === undefined
    ) {
      return undefined
    }

    return getChallengeLegStatuses(visits, activePlayer.playerId, matchProgress)
  }, [activePlayer, matchProgress, visits])

  const challengeScoreDetails = useMemo(() => {
    if (
      mode !== GameModeId.X01 ||
      !isX01Config(mode, config) ||
      !isChallengeMode(matchProgress) ||
      activePlayer === undefined ||
      matchProgress === undefined
    ) {
      return undefined
    }

    return buildChallengeScoreDetails(visits, matchProgress, activePlayer, config.startScore)
  }, [activePlayer, config, matchProgress, mode, visits])

  const playersForDisplay = useMemo((): ScoreboardDisplayPlayer[] => {
    if (
      mode === GameModeId.OneTwentyOne &&
      isOneTwentyOneConfig(mode, config) &&
      activePlayer !== undefined
    ) {
      const visitInProgress = getChallengeVisitInProgress(activePlayer.visitsOnTarget ?? 0)
      const secondaryMetrics = buildVisitScoreMetric(visitInProgress, config.maxVisitsPerTarget)

      return players.map((player) =>
        player.playerId === activePlayer.playerId ? { ...player, secondaryMetrics } : player,
      )
    }

    if (mode === GameModeId.BullRun) {
      return players.map((player) => {
        const liveStats = getBullRunLiveStats(
          visits,
          player.playerId,
          player.isActive ? pendingDarts : [],
          player.isActive,
        )

        return {
          ...player,
          primaryScore: liveStats.score,
          primaryDisplay: String(liveStats.score),
          secondaryMetrics: getBullRunLiveScoreMetrics(liveStats),
        }
      })
    }

    if (mode !== GameModeId.AroundTheClock || !isAroundTheClockConfig(mode, config)) {
      return players
    }

    const { aimMode } = getAroundTheClockConfig(config)

    return players.map((player) => {
      const committedTargetIndex = player.aroundTheClockTargetIndex ?? 0
      const liveStats = getAroundTheClockLiveStats(
        visits,
        player.playerId,
        committedTargetIndex,
        pendingDarts,
        aimMode,
        player.isActive,
      )

      return {
        ...player,
        primaryDisplay: String(liveStats.dartsThrown),
        secondaryMetrics: buildAroundTheClockScoreMetrics(liveStats),
      }
    })
  }, [activePlayer, config, mode, pendingDarts, players, visits])

  const ninetyNineDartsMetrics = useMemo(() => {
    if (
      mode !== GameModeId.NinetyNineDarts ||
      !isNinetyNineDartsConfig(mode, config) ||
      activePlayer === undefined
    ) {
      return null
    }

    return getNinetyNineDartsLiveScoreMetrics(
      getNinetyNineDartsLiveStats(visits, activePlayer.playerId, config.target, pendingDarts),
    )
  }, [activePlayer, config, mode, pendingDarts, visits])

  return (
    <Stack gap={5}>
      {mode === GameModeId.Hunter ? (
        <HunterBoardPanel players={playersForDisplay} visits={visits} pendingDarts={pendingDarts} />
      ) : ninetyNineDartsMetrics !== null ? (
        <NinetyNineDartsScorePanel
          metrics={ninetyNineDartsMetrics}
          isActive={activePlayer?.isActive ?? true}
        />
      ) : (
        <PlayerScorePanels
          players={playersForDisplay}
          legAndMatchAverages={legAndMatchAverages}
          matchCheckoutByPlayer={matchCheckoutByPlayer}
          currentLeg={matchProgress?.currentLeg}
          legsToWin={matchProgress?.legsToWin}
          legWins={matchProgress?.legWins}
          challengeLegStatuses={challengeLegStatuses}
          challengeScoreDetails={challengeScoreDetails}
          legStartingPlayerIndex={legStartingPlayerIndex}
          checkoutRules={checkoutRules}
        />
      )}

      {activePlayer !== undefined && showVisitDartSlots && (
        <VisitDartSlots
          scoreBeforeVisit={scoreBeforeVisit}
          pendingDarts={pendingDarts}
          config={checkoutRules}
        />
      )}
    </Stack>
  )
}
