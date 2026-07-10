import { Box, Grid } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { gameMainMaxWidth } from '../layout'
import type { GameModeId } from '../types/gameMode'
import type { Player } from '../types/player'
import type { Visit } from '../types/visit'
import { VisitHistoryColumn } from './Scoreboard/VisitHistoryColumn'

export interface GameBoardLayoutProps {
  players: Player[]
  visits: Visit[]
  mode: GameModeId
  showVisitHistory: boolean
  children: ReactNode
}

export const GameBoardLayout = ({
  players,
  visits,
  mode,
  showVisitHistory,
  children,
}: GameBoardLayoutProps) => {
  const [leftPlayer, rightPlayer] = players
  const showPlayerName = players.length > 1

  return (
    <Grid
      templateColumns={{
        base: '1fr',
        lg: showVisitHistory ? 'minmax(160px, 200px) minmax(0, 1fr) minmax(160px, 200px)' : '1fr',
      }}
      gap={{ base: 6, lg: 6 }}
      alignItems="start"
      justifyContent="center"
      mx="auto"
      w="full"
    >
      {showVisitHistory && leftPlayer !== undefined && (
        <VisitHistoryColumn
          player={leftPlayer}
          visits={visits}
          mode={mode}
          align="left"
          showPlayerName={showPlayerName}
        />
      )}

      <Box w="full" maxW={gameMainMaxWidth} justifySelf="center">
        {children}
      </Box>

      {showVisitHistory &&
        (rightPlayer === undefined ? (
          <Box display={{ base: 'none', lg: 'block' }} aria-hidden="true" />
        ) : (
          <VisitHistoryColumn
            player={rightPlayer}
            visits={visits}
            mode={mode}
            align="right"
            showPlayerName={showPlayerName}
          />
        ))}
    </Grid>
  )
}
