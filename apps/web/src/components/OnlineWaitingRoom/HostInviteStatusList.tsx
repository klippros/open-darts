import { Stack, Text } from '@chakra-ui/react'
import { inviteStatusLabel } from '../../lib/social/inviteApi'
import type { OnlineMatchInviteHostRow } from '../../lib/social/types'

export interface HostInviteStatusListProps {
  invites: OnlineMatchInviteHostRow[]
}

export const HostInviteStatusList = ({ invites }: HostInviteStatusListProps) => {
  if (invites.length === 0) {
    return null
  }

  return (
    <Stack gap={1}>
      <Text color="whiteAlpha.700" fontSize="sm" fontWeight="semibold">
        Invited
      </Text>
      {invites.map((invite) => (
        <Text key={invite.inviteId} color="whiteAlpha.800" fontSize="sm">
          {invite.inviteeDisplayName} — {inviteStatusLabel(invite.status)}
        </Text>
      ))}
    </Stack>
  )
}
