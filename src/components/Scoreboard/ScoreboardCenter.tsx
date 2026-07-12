import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '../../lib/dartScoring'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import { toCheckoutSuggestionRules } from '../../lib/game/gameConfigGuards'
import type { MatchProgress } from '../../types/match'
import type { DartThrow } from '../../types/dart'
import type { GameConfig, GameModeId } from '../../types/gameMode'
import { PlayerScorePanels } from './PlayerScorePanel'
import { VisitDartSlots } from './VisitDartSlots'

export interface ScoreboardCenterProps {
  mode: GameModeId
  players: ScoreboardPlayerEntry[]
  visitAverages: Record<string, number | null>
  activePlayer: ScoreboardPlayerEntry | undefined
  pendingDarts: DartThrow[]
  config: GameConfig
  matchProgress?: MatchProgress
}

export const ScoreboardCenter = ({
  mode,
  players,
  visitAverages,
  activePlayer,
  pendingDarts,
  config,
  matchProgress,
}: ScoreboardCenterProps) => {
  const checkoutRules = toCheckoutSuggestionRules(mode, config)
  const scoreBeforeVisit =
    activePlayer === undefined ? 0 : activePlayer.primaryScore + sumDartPoints(pendingDarts)

  return (
    <Stack gap={5}>
      <PlayerScorePanels
        players={players}
        visitAverages={visitAverages}
        legsToWin={matchProgress?.legsToWin}
        legWins={matchProgress?.legWins}
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
