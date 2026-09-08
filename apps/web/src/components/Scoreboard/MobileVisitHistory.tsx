import { SimpleGrid, Stack } from '@chakra-ui/react'
import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { isAroundTheClockConfig } from '@open-darts/game/game/gameConfigGuards'
import type { GameConfig, GameModeId } from '@open-darts/game/types/gameMode'
import type { Player } from '@open-darts/game/types/player'
import type { Visit } from '@open-darts/game/types/visit'
import { AroundTheClockHistoryColumn } from './AroundTheClockHistoryColumn'
import { VisitHistoryColumn } from './VisitHistoryColumn'

export interface MobileVisitHistoryProps {
  players: Player[]
  visits: Visit[]
  mode: GameModeId
  config: GameConfig
  currentLeg?: number
  waitingPlayerId?: string | null
}

export const MobileVisitHistory = ({
  players,
  visits,
  mode,
  config,
  currentLeg,
  waitingPlayerId = null,
}: MobileVisitHistoryProps) => {
  const showPlayerName = players.length > 1
  const aroundTheClockConfig = isAroundTheClockConfig(mode, config)
    ? getAroundTheClockConfig(config)
    : null

  const columns = players.map((player, index) => {
    const align = showPlayerName && index > 0 ? 'right' : 'left'

    return aroundTheClockConfig === null ? (
      <VisitHistoryColumn
        key={player.id}
        player={player}
        visits={visits}
        mode={mode}
        currentLeg={currentLeg}
        align={align}
        showPlayerName={showPlayerName}
        variant="stack"
        showWaitingVisit={waitingPlayerId === player.id}
      />
    ) : (
      <AroundTheClockHistoryColumn
        key={player.id}
        player={player}
        visits={visits}
        config={aroundTheClockConfig}
        currentLeg={currentLeg}
        align={align}
        showPlayerName={showPlayerName}
        variant="stack"
        showWaitingVisit={waitingPlayerId === player.id}
      />
    )
  })

  if (players.length > 1) {
    return (
      <SimpleGrid columns={2} gap={3} w="full" alignItems="start">
        {columns}
      </SimpleGrid>
    )
  }

  return (
    <Stack gap={6} w="full">
      {columns}
    </Stack>
  )
}
