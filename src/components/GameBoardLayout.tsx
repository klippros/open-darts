import { Box, Grid } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { gameMainMaxWidth } from '../layout'
import { getAroundTheClockConfig } from '../lib/aroundTheClock/aroundTheClockConfig'
import { isAroundTheClockConfig } from '../lib/game/gameConfigGuards'
import type { GameConfig, GameModeId } from '../types/gameMode'
import type { Player } from '../types/player'
import type { Visit } from '../types/visit'
import { AroundTheClockHistoryColumn } from './Scoreboard/AroundTheClockHistoryColumn'
import { VisitHistoryColumn } from './Scoreboard/VisitHistoryColumn'

export interface GameBoardLayoutProps {
  players: Player[]
  visits: Visit[]
  mode: GameModeId
  config: GameConfig
  currentLeg?: number
  showVisitHistory: boolean
  children: ReactNode
}

export const GameBoardLayout = ({
  players,
  visits,
  mode,
  config,
  currentLeg,
  showVisitHistory,
  children,
}: GameBoardLayoutProps) => {
  const [leftPlayer, rightPlayer] = players
  const showPlayerName = players.length > 1
  const aroundTheClockConfig = isAroundTheClockConfig(mode, config)
    ? getAroundTheClockConfig(config)
    : null

  const renderHistoryColumn = (player: Player, align: 'left' | 'right') =>
    aroundTheClockConfig !== null ? (
      <AroundTheClockHistoryColumn
        player={player}
        visits={visits}
        config={aroundTheClockConfig}
        currentLeg={currentLeg}
        align={align}
        showPlayerName={showPlayerName}
      />
    ) : (
      <VisitHistoryColumn
        player={player}
        visits={visits}
        mode={mode}
        currentLeg={currentLeg}
        align={align}
        showPlayerName={showPlayerName}
      />
    )

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
      {showVisitHistory && leftPlayer !== undefined && renderHistoryColumn(leftPlayer, 'left')}

      <Box w="full" maxW={gameMainMaxWidth} justifySelf="center">
        {children}
      </Box>

      {showVisitHistory &&
        (rightPlayer === undefined ? (
          <Box display={{ base: 'none', lg: 'block' }} aria-hidden="true" />
        ) : (
          renderHistoryColumn(rightPlayer, 'right')
        ))}
    </Grid>
  )
}
