import { useMemo } from 'react'
import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '../../lib/dartScoring'
import {
  formatAroundTheClockLiveStatsLabel,
  getAroundTheClockLiveStats,
} from '../../lib/analytics/aroundTheClockStats'
import { getAroundTheClockConfig } from '../../lib/aroundTheClock/aroundTheClockConfig'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import {
  countPlayerVisitsInLeg,
  formatChallengeVisitProgressLabel,
  getChallengeLegStatuses,
  isChallengeMode,
} from '../../lib/game/challenge'
import { formatOneTwentyOneVisitProgressLabel } from '../../lib/oneTwentyOne/formatOneTwentyOneVisitProgress'
import {
  isAroundTheClockConfig,
  isOneTwentyOneConfig,
  isX01Config,
  toCheckoutSuggestionRules,
} from '../../lib/game/gameConfigGuards'
import { getLegStartingPlayerIndex } from '../../lib/game/matchLegs'
import { GameModeId } from '../../types/gameMode'
import type { MatchProgress } from '../../types/match'
import type { DartThrow } from '../../types/dart'
import type { GameConfig, GameModeId as GameModeIdType } from '../../types/gameMode'
import type { Visit } from '../../types/visit'
import { PlayerScorePanels } from './PlayerScorePanel'
import { VisitDartSlots } from './VisitDartSlots'

export interface ScoreboardCenterProps {
  mode: GameModeIdType
  players: ScoreboardPlayerEntry[]
  legAndMatchAverages: Record<string, { leg: number | null; match: number | null }>
  activePlayer: ScoreboardPlayerEntry | undefined
  pendingDarts: DartThrow[]
  visits: Visit[]
  config: GameConfig
  matchProgress?: MatchProgress
  hideVisitDartSlots?: boolean
}

const buildChallengeSecondaryLabel = (
  visits: Visit[],
  matchProgress: MatchProgress,
  activePlayer: ScoreboardPlayerEntry,
  pendingDarts: DartThrow[],
): string | undefined => {
  const challenge = matchProgress.challenge

  if (challenge === undefined) {
    return undefined
  }

  const currentLeg = matchProgress.currentLeg
  const committedVisits = countPlayerVisitsInLeg(visits, currentLeg, activePlayer.playerId)
  const visitsUsed = committedVisits + (pendingDarts.length > 0 ? 1 : 0)
  const visitLabel = formatChallengeVisitProgressLabel(
    visitsUsed,
    challenge.maxVisits,
    activePlayer.primaryScore,
  )

  return visitLabel
}

const buildOneTwentyOneSecondaryLabel = (
  activePlayer: ScoreboardPlayerEntry,
  maxVisitsPerTarget: number,
  pendingDarts: DartThrow[],
): string => {
  const visitsUsed = (activePlayer.visitsOnTarget ?? 0) + (pendingDarts.length > 0 ? 1 : 0)

  return formatOneTwentyOneVisitProgressLabel(visitsUsed, maxVisitsPerTarget)
}

export const ScoreboardCenter = ({
  mode,
  players,
  legAndMatchAverages,
  activePlayer,
  pendingDarts,
  visits,
  config,
  matchProgress,
  hideVisitDartSlots = false,
}: ScoreboardCenterProps) => {
  const checkoutRules = toCheckoutSuggestionRules(mode, config)
  const showVisitDartSlots =
    !hideVisitDartSlots && mode !== GameModeId.AroundTheClock && mode !== GameModeId.Bob27
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

  const playersForDisplay = useMemo(() => {
    if (
      mode === GameModeId.X01 &&
      isX01Config(mode, config) &&
      isChallengeMode(matchProgress) &&
      activePlayer !== undefined &&
      matchProgress !== undefined
    ) {
      const challengeLabel = buildChallengeSecondaryLabel(
        visits,
        matchProgress,
        activePlayer,
        pendingDarts,
      )

      return players.map((player) =>
        player.playerId === activePlayer.playerId && challengeLabel !== undefined
          ? { ...player, secondaryLabel: challengeLabel }
          : player,
      )
    }

    if (
      mode === GameModeId.OneTwentyOne &&
      isOneTwentyOneConfig(mode, config) &&
      activePlayer !== undefined
    ) {
      const visitLabel = buildOneTwentyOneSecondaryLabel(
        activePlayer,
        config.maxVisitsPerTarget,
        pendingDarts,
      )

      return players.map((player) =>
        player.playerId === activePlayer.playerId
          ? { ...player, secondaryLabel: visitLabel }
          : player,
      )
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
        secondaryLabel: formatAroundTheClockLiveStatsLabel(liveStats),
      }
    })
  }, [activePlayer, config, matchProgress, mode, pendingDarts, players, visits])

  return (
    <Stack gap={5}>
      <PlayerScorePanels
        players={playersForDisplay}
        legAndMatchAverages={legAndMatchAverages}
        currentLeg={matchProgress?.currentLeg}
        legsToWin={matchProgress?.legsToWin}
        legWins={matchProgress?.legWins}
        challengeLegStatuses={challengeLegStatuses}
        legStartingPlayerIndex={legStartingPlayerIndex}
      />

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
