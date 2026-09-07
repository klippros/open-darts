import { useMemo } from 'react'
import type { ScoreboardSnapshot } from '@open-darts/game/game/GameEngine'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { Player } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameConfig } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { ScoreboardCenter } from './ScoreboardCenter'
import { getLegAndMatchAverages } from './scoreboardStats'

export interface ScoreboardProps {
  mode: GameModeId
  scoreboard: ScoreboardSnapshot
  pendingDarts: DartThrow[]
  visits: Visit[]
  players: Player[]
  config: GameConfig
  matchProgress?: GameSession['matchProgress']
  hideVisitDartSlots?: boolean
}

export const Scoreboard = ({
  mode,
  scoreboard,
  pendingDarts,
  visits,
  players,
  config,
  matchProgress,
  hideVisitDartSlots = false,
}: ScoreboardProps) => {
  const legAndMatchAverages = useMemo(
    () =>
      mode === GameModeId.X01
        ? getLegAndMatchAverages(players, visits, matchProgress?.currentLeg)
        : {},
    [mode, players, visits, matchProgress?.currentLeg],
  )
  const activePlayer = scoreboard.players.find((player) => player.isActive)

  return (
    <ScoreboardCenter
      mode={mode}
      players={scoreboard.players}
      legAndMatchAverages={legAndMatchAverages}
      activePlayer={activePlayer}
      pendingDarts={pendingDarts}
      visits={visits}
      config={config}
      matchProgress={matchProgress}
      hideVisitDartSlots={hideVisitDartSlots}
    />
  )
}
