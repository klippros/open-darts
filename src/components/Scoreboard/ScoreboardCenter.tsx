import { useMemo } from 'react'
import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '../../lib/dartScoring'
import {
  formatAroundTheClockLiveStatsLabel,
  getAroundTheClockLiveStats,
} from '../../lib/analytics/aroundTheClockStats'
import { getAroundTheClockConfig } from '../../lib/aroundTheClock/aroundTheClockConfig'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import { isAroundTheClockConfig, toCheckoutSuggestionRules } from '../../lib/game/gameConfigGuards'
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
}: ScoreboardCenterProps) => {
  const checkoutRules = toCheckoutSuggestionRules(mode, config)
  const showVisitDartSlots = mode !== GameModeId.AroundTheClock
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

  const playersForDisplay = useMemo(() => {
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
        secondaryLabel: formatAroundTheClockLiveStatsLabel(liveStats),
      }
    })
  }, [config, mode, pendingDarts, players, visits])

  return (
    <Stack gap={5}>
      <PlayerScorePanels
        players={playersForDisplay}
        legAndMatchAverages={legAndMatchAverages}
        currentLeg={matchProgress?.currentLeg}
        legsToWin={matchProgress?.legsToWin}
        legWins={matchProgress?.legWins}
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
