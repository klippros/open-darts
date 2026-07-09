import { useMemo } from 'react'
import type { ScoreboardSnapshot } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import type { X01Config } from '../../types/x01'
import { ScoreboardCenter } from './ScoreboardCenter'
import { getVisitAverages } from './scoreboardStats'

export interface ScoreboardProps {
  scoreboard: ScoreboardSnapshot
  pendingDarts: DartThrow[]
  visits: Visit[]
  players: Player[]
  config: X01Config
}

export const Scoreboard = ({
  scoreboard,
  pendingDarts,
  visits,
  players,
  config,
}: ScoreboardProps) => {
  const visitAverages = useMemo(() => getVisitAverages(players, visits), [players, visits])
  const activePlayer = scoreboard.players.find((player) => player.isActive)

  return (
    <ScoreboardCenter
      players={scoreboard.players}
      visitAverages={visitAverages}
      activePlayer={activePlayer}
      pendingDarts={pendingDarts}
      config={config}
    />
  )
}
