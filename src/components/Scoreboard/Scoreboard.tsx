import { Grid } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { ScoreboardSnapshot } from '../../lib/game/GameEngine'
import type { DartThrow } from '../../types/dart'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import type { X01Config } from '../../types/x01'
import { ScoreboardCenter } from './ScoreboardCenter'
import { getVisitAverages } from './scoreboardStats'
import { VisitHistoryColumn } from './VisitHistoryColumn'

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
  const isSolo = players.length === 1
  const [leftPlayer, rightPlayer] = players

  return (
    <Grid
      templateColumns={{
        base: '1fr',
        lg: isSolo ? 'minmax(180px, 220px) minmax(0, 1fr)' : 'minmax(180px, 220px) minmax(0, 1fr) minmax(180px, 220px)',
      }}
      gap={{ base: 6, lg: 8 }}
      alignItems="start"
    >
      {leftPlayer !== undefined && (
        <VisitHistoryColumn player={leftPlayer} visits={visits} align="left" />
      )}

      <ScoreboardCenter
        players={scoreboard.players}
        visitAverages={visitAverages}
        activePlayer={activePlayer}
        pendingDarts={pendingDarts}
        config={config}
      />

      {rightPlayer !== undefined && (
        <VisitHistoryColumn player={rightPlayer} visits={visits} align="right" />
      )}
    </Grid>
  )
}
