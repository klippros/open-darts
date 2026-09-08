import { Stack, Text } from '@chakra-ui/react'
import { SetupPageHeader } from '../SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../SetupPageLayout/SetupPageLayout'
import type { PublicMatchState } from '../../lib/matchServer/types'
import { OnlineWaitingActions } from './OnlineWaitingActions'
import { OnlineWaitingInviteLink } from './OnlineWaitingInviteLink'
import { OnlineWaitingPlayers } from './OnlineWaitingPlayers'

export interface OnlineWaitingRoomProps {
  state: PublicMatchState
  currentUserId: string
  resolveDisplayName: (userId: string) => string
  onBegin: () => void
  onKick: (targetUserId: string) => void
  onLeaveOrCancel: () => void
}

export const OnlineWaitingRoom = ({
  state,
  currentUserId,
  resolveDisplayName,
  onBegin,
  onKick,
  onLeaveOrCancel,
}: OnlineWaitingRoomProps) => {
  const isCreator = state.creatorUserId === currentUserId
  const opponent = state.players.find((player) => player.userId !== currentUserId)
  const canBegin = state.players.length === 2
  const canKick = opponent !== undefined

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Waiting room"
          description="Share the invite link. The host can start once both players are here."
        />

        {isCreator && <OnlineWaitingInviteLink inviteToken={state.inviteToken} />}

        {!isCreator && (
          <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
            Waiting for the host to begin the match.
          </Text>
        )}

        <OnlineWaitingPlayers
          players={state.players}
          creatorUserId={state.creatorUserId}
          currentUserId={currentUserId}
          resolveDisplayName={resolveDisplayName}
        />

        <OnlineWaitingActions
          isCreator={isCreator}
          canBegin={canBegin}
          canKick={canKick}
          onBegin={onBegin}
          onKick={() => {
            if (opponent !== undefined) {
              onKick(opponent.userId)
            }
          }}
          onLeaveOrCancel={onLeaveOrCancel}
          leaveLabel={isCreator ? 'Cancel match' : 'Leave waiting room'}
        />
      </Stack>
    </SetupPageLayout>
  )
}
