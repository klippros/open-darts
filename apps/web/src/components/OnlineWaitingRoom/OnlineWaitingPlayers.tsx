import { Stack, Text } from '@chakra-ui/react'
import type { MatchPlayerSnapshot } from '../../lib/matchServer/types'
import { OnlineWaitingInviteSlot } from './OnlineWaitingInviteSlot'
import { OnlineWaitingPlayerRow } from './OnlineWaitingPlayerRow'

export interface OnlineWaitingPlayersProps {
  players: MatchPlayerSnapshot[]
  creatorUserId: string
  currentUserId: string
  resolveDisplayName: (userId: string) => string
  inviteToken?: string
  onKick?: (targetUserId: string) => void
}

export const OnlineWaitingPlayers = ({
  players,
  creatorUserId,
  currentUserId,
  resolveDisplayName,
  inviteToken,
  onKick,
}: OnlineWaitingPlayersProps) => {
  const isHost = creatorUserId === currentUserId
  const showInviteSlot = isHost && players.length < 2 && inviteToken !== undefined

  return (
    <Stack gap={3}>
      <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
        Players ({players.length}/2)
      </Text>
      <Stack gap={2}>
        {players.map((player) => {
          const isYou = player.userId === currentUserId
          const canKick = isHost && !isYou && onKick !== undefined

          return (
            <OnlineWaitingPlayerRow
              key={player.userId}
              player={player}
              isCreator={player.userId === creatorUserId}
              isYou={isYou}
              displayName={resolveDisplayName(player.userId)}
              onKick={
                canKick
                  ? () => {
                      onKick(player.userId)
                    }
                  : undefined
              }
            />
          )
        })}
        {showInviteSlot && <OnlineWaitingInviteSlot inviteToken={inviteToken} />}
      </Stack>
    </Stack>
  )
}
