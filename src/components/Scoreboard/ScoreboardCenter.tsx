import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '../../lib/dartScoring'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import { toCheckoutSuggestionConfig } from '../../lib/game/gameConfigGuards'
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
}

export const ScoreboardCenter = ({
  mode,
  players,
  visitAverages,
  activePlayer,
  pendingDarts,
  config,
}: ScoreboardCenterProps) => {
  const checkoutConfig = toCheckoutSuggestionConfig(mode, config)
  const scoreBeforeVisit =
    activePlayer === undefined ? 0 : activePlayer.primaryScore + sumDartPoints(pendingDarts)

  return (
    <Stack gap={5}>
      <PlayerScorePanels players={players} visitAverages={visitAverages} />

      {checkoutConfig !== null && activePlayer !== undefined && (
        <VisitDartSlots
          scoreBeforeVisit={scoreBeforeVisit}
          pendingDarts={pendingDarts}
          config={checkoutConfig}
        />
      )}
    </Stack>
  )
}
