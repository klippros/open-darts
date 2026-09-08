import { Stack, Text } from '@chakra-ui/react'
import type { MatchPlayerSnapshot } from '../../lib/matchServer/types'
import { OnlineWaitingPlayerRow } from './OnlineWaitingPlayerRow'

export interface OnlineWaitingPlayersProps {
  players: MatchPlayerSnapshot[]
  creatorUserId: string
  currentUserId: string
  resolveDisplayName: (userId: string) => string
}

export const OnlineWaitingPlayers = ({
  players,
  creatorUserId,
  currentUserId,
  resolveDisplayName,
}: OnlineWaitingPlayersProps) => (
  <Stack gap={3}>
    <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
      Players ({players.length}/2)
    </Text>
    <Stack gap={2}>
      {players.map((player) => (
        <OnlineWaitingPlayerRow
          key={player.userId}
          player={player}
          isCreator={player.userId === creatorUserId}
          isYou={player.userId === currentUserId}
          displayName={resolveDisplayName(player.userId)}
        />
      ))}
    </Stack>
  </Stack>
)
