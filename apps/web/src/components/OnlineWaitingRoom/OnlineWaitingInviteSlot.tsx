import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { buildInviteAbsoluteUrl } from '../../lib/matchServer/api'
import { listOnlineMatchInvitesForMatch } from '../../lib/social/inviteApi'
import { createRequestGeneration } from '../../lib/social/requestGeneration'
import type { OnlineMatchInviteHostRow } from '../../lib/social/types'
import { supabaseClient } from '../../lib/supabase/client'
import { FollowedPlayerInvitePicker } from './FollowedPlayerInvitePicker'
import { HostInviteStatusList } from './HostInviteStatusList'

export interface OnlineWaitingInviteSlotProps {
  matchId: string
  inviteToken: string
  canInvite: boolean
}

export const OnlineWaitingInviteSlot = ({
  matchId,
  inviteToken,
  canInvite,
}: OnlineWaitingInviteSlotProps) => {
  const [copied, setCopied] = useState(false)
  const [invites, setInvites] = useState<OnlineMatchInviteHostRow[]>([])
  const inviteUrl = buildInviteAbsoluteUrl(inviteToken)
  const requestGenerationRef = useRef(createRequestGeneration())

  const refreshInvites = useEffectEvent(async (targetMatchId: string) => {
    const requestId = requestGenerationRef.current.next()
    try {
      const next = await listOnlineMatchInvitesForMatch(targetMatchId)
      if (!requestGenerationRef.current.isCurrent(requestId) || targetMatchId !== matchId) {
        return
      }
      setInvites(next)
    } catch {
      // Keep the last known host view if refresh fails.
    }
  })

  useEffect(() => {
    requestGenerationRef.current.invalidate()
    setInvites([])
    void refreshInvites(matchId)
  }, [matchId])

  useEffect(() => {
    const client = supabaseClient
    if (client === null) {
      return undefined
    }

    const channel = client
      .channel(`online-match-invites-host-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_match_invites',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void refreshInvites(matchId)
        },
      )
      .subscribe(() => {
        void refreshInvites(matchId)
      })

    return () => {
      void client.removeChannel(channel)
    }
  }, [matchId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Stack
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={4}
      py={3}
      gap={3}
    >
      <Stack gap={0.5}>
        <Text color="white" fontWeight="semibold">
          {canInvite ? 'Invite an opponent' : 'Invites'}
        </Text>
        <Text color="whiteAlpha.700" fontSize="sm">
          {canInvite
            ? 'Copy a link or invite someone you follow.'
            : 'Waiting room is full. Existing invites stay listed until the match begins.'}
        </Text>
      </Stack>

      {canInvite ? (
        <Stack gap={2} align="stretch">
          <Button
            variant="cancel"
            alignSelf="flex-start"
            onClick={() => {
              void handleCopy()
            }}
          >
            {copied ? 'Copied' : 'Copy invite link'}
          </Button>
          <FollowedPlayerInvitePicker
            matchId={matchId}
            onInvited={(invite) => {
              setInvites((current) => {
                if (current.some((row) => row.inviteId === invite.inviteId)) {
                  return current
                }
                return [...current, invite]
              })
            }}
          />
        </Stack>
      ) : null}

      <HostInviteStatusList invites={invites} />
    </Stack>
  )
}
