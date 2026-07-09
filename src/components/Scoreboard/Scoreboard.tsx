import { useMemo } from 'react'
import type { ScoreboardSnapshot } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import { ScoreboardCenter } from './ScoreboardCenter'
import { getVisitAverages } from './scoreboardStats'

export interface ScoreboardProps {
  mode: GameModeId
  scoreboard: ScoreboardSnapshot
  pendingDarts: DartThrow[]
  visits: Visit[]
  players: Player[]
  config: GameConfig
}

export const Scoreboard = ({
  mode,
  scoreboard,
  pendingDarts,
  visits,
  players,
  config,
}: ScoreboardProps) => {
  const visitAverages = useMemo(
    () => (mode === GameModeId.X01 ? getVisitAverages(players, visits) : {}),
    [mode, players, visits],
  )
  const activePlayer = scoreboard.players.find((player) => player.isActive)

  return (
    <ScoreboardCenter
      mode={mode}
      players={scoreboard.players}
      visitAverages={visitAverages}
      activePlayer={activePlayer}
      pendingDarts={pendingDarts}
      config={config}
    />
  )
}
