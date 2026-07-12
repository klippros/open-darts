import { useMemo } from 'react'
import type { ScoreboardSnapshot } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import { GameModeId } from '../../types/gameMode'
import type { GameConfig } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
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
}

export const Scoreboard = ({
  mode,
  scoreboard,
  pendingDarts,
  visits,
  players,
  config,
  matchProgress,
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
      config={config}
      matchProgress={matchProgress}
    />
  )
}
