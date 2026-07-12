import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '../../lib/dartScoring'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import { toCheckoutSuggestionRules } from '../../lib/game/gameConfigGuards'
import { getLegStartingPlayerIndex } from '../../lib/game/matchLegs'
import type { MatchProgress } from '../../types/match'
import type { DartThrow } from '../../types/dart'
import type { GameConfig, GameModeId } from '../../types/gameMode'
import { PlayerScorePanels } from './PlayerScorePanel'
import { VisitDartSlots } from './VisitDartSlots'

export interface ScoreboardCenterProps {
  mode: GameModeId
  players: ScoreboardPlayerEntry[]
  legAndMatchAverages: Record<string, { leg: number | null; match: number | null }>
  activePlayer: ScoreboardPlayerEntry | undefined
  pendingDarts: DartThrow[]
  config: GameConfig
  matchProgress?: MatchProgress
}

export const ScoreboardCenter = ({
  mode,
  players,
  legAndMatchAverages,
  activePlayer,
  pendingDarts,
  config,
  matchProgress,
}: ScoreboardCenterProps) => {
  const checkoutRules = toCheckoutSuggestionRules(mode, config)
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

  return (
    <Stack gap={5}>
      <PlayerScorePanels
        players={players}
        legAndMatchAverages={legAndMatchAverages}
        currentLeg={matchProgress?.currentLeg}
        legsToWin={matchProgress?.legsToWin}
        legWins={matchProgress?.legWins}
        legStartingPlayerIndex={legStartingPlayerIndex}
      />

      {activePlayer !== undefined && (
        <VisitDartSlots
          scoreBeforeVisit={scoreBeforeVisit}
          pendingDarts={pendingDarts}
          config={checkoutRules}
        />
      )}
    </Stack>
  )
}
