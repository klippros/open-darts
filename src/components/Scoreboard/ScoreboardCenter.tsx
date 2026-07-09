import { Stack } from '@chakra-ui/react'
import { sumDartPoints } from '../../lib/dartScoring'
import type { ScoreboardPlayerEntry } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import type { X01Config } from '../../types/x01'
import { PlayerScorePanels } from './PlayerScorePanel'
import { VisitDartSlots } from './VisitDartSlots'

export interface ScoreboardCenterProps {
  players: ScoreboardPlayerEntry[]
  visitAverages: Record<string, number | null>
  activePlayer: ScoreboardPlayerEntry | undefined
  pendingDarts: DartThrow[]
  config: X01Config
}

export const ScoreboardCenter = ({
  players,
  visitAverages,
  activePlayer,
  pendingDarts,
  config,
}: ScoreboardCenterProps) => {
  const scoreBeforeVisit =
    activePlayer === undefined
      ? 0
      : activePlayer.primaryScore + sumDartPoints(pendingDarts)

  return (
    <Stack gap={5}>
      <PlayerScorePanels players={players} visitAverages={visitAverages} />

      {activePlayer !== undefined && (
        <VisitDartSlots
          scoreBeforeVisit={scoreBeforeVisit}
          pendingDarts={pendingDarts}
          config={config}
        />
      )}
    </Stack>
  )
}
