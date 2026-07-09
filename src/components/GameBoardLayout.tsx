import { Box, Grid } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { gameMainMaxWidth } from '../layout'
import type { Player } from '../types/player'
import type { Visit } from '../types/visit'
import { VisitHistoryColumn } from './Scoreboard/VisitHistoryColumn'

export interface GameBoardLayoutProps {
  players: Player[]
  visits: Visit[]
  children: ReactNode
}

export const GameBoardLayout = ({ players, visits, children }: GameBoardLayoutProps) => {
  const [leftPlayer, rightPlayer] = players

  return (
    <Grid
      templateColumns={{
        base: '1fr',
        lg: 'minmax(160px, 200px) minmax(0, 1fr) minmax(160px, 200px)',
      }}
      gap={{ base: 6, lg: 6 }}
      alignItems="start"
      justifyContent="center"
      mx="auto"
      w="full"
    >
      {leftPlayer !== undefined && (
        <VisitHistoryColumn player={leftPlayer} visits={visits} align="left" />
      )}

      <Box w="full" maxW={gameMainMaxWidth} justifySelf="center">
        {children}
      </Box>

      {rightPlayer === undefined ? (
        <Box display={{ base: 'none', lg: 'block' }} aria-hidden="true" />
      ) : (
        <VisitHistoryColumn player={rightPlayer} visits={visits} align="right" />
      )}
    </Grid>
  )
}
