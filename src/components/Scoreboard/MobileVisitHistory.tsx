import { Stack } from '@chakra-ui/react'
import { getAroundTheClockConfig } from '../../lib/aroundTheClock/aroundTheClockConfig'
import { isAroundTheClockConfig } from '../../lib/game/gameConfigGuards'
import type { GameConfig, GameModeId } from '../../types/gameMode'
import type { Player } from '../../types/player'
import type { Visit } from '../../types/visit'
import { AroundTheClockHistoryColumn } from './AroundTheClockHistoryColumn'
import { VisitHistoryColumn } from './VisitHistoryColumn'

export interface MobileVisitHistoryProps {
  players: Player[]
  visits: Visit[]
  mode: GameModeId
  config: GameConfig
  currentLeg?: number
}

export const MobileVisitHistory = ({
  players,
  visits,
  mode,
  config,
  currentLeg,
}: MobileVisitHistoryProps) => {
  const showPlayerName = players.length > 1
  const aroundTheClockConfig = isAroundTheClockConfig(mode, config)
    ? getAroundTheClockConfig(config)
    : null

  return (
    <Stack gap={6} w="full">
      {players.map((player) =>
        aroundTheClockConfig === null ? (
          <VisitHistoryColumn
            key={player.id}
            player={player}
            visits={visits}
            mode={mode}
            currentLeg={currentLeg}
            showPlayerName={showPlayerName}
            variant="stack"
          />
        ) : (
          <AroundTheClockHistoryColumn
            key={player.id}
            player={player}
            visits={visits}
            config={aroundTheClockConfig}
            currentLeg={currentLeg}
            showPlayerName={showPlayerName}
            variant="stack"
          />
        ),
      )}
    </Stack>
  )
}
