import { Box, Button, Stack, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePendingOnlineMatchInvites } from '../../hooks/usePendingOnlineMatchInvites'
import {
  buildMatchPath,
  getMyInProgressOnlineMatch,
  joinMatch,
  MatchServerApiError,
} from '../../lib/matchServer/api'
import { InviteApiError, respondOnlineMatchInvite } from '../../lib/social/inviteApi'
import { getInviteModeLabel } from '../../lib/social/inviteModeLabel'
import { selectVisiblePendingInvites } from '../../lib/social/pendingInviteVisibility'
import { OnlineMatchInviteOutcome } from '../../lib/social/types'
import type { PendingOnlineMatchInvite } from '../../lib/social/types'

const InviteCard = ({
  invite,
  disabled,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  invite: PendingOnlineMatchInvite
  disabled: boolean
  busy: boolean
  error: string | null
  onAccept: () => void
  onDecline: () => void
}) => (
  <Box
    borderWidth="1px"
    borderColor="teal.300"
    borderRadius="lg"
    bg="rgba(49, 151, 149, 0.16)"
    px={5}
    py={4}
  >
    <Stack gap={3} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }}>
      <Stack gap={1} flex="1">
        <Text fontWeight="semibold" color="white">
          {invite.inviterDisplayName} invited you
        </Text>
        <Text fontSize="sm" color="whiteAlpha.700">
          {getInviteModeLabel(invite.mode, invite.config)}
          {invite.legsToWin > 1 ? ` · first to ${String(invite.legsToWin)}` : ''}
        </Text>
        {error !== null ? (
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        ) : null}
      </Stack>
      <Stack direction="row" gap={2} flexShrink={0}>
        <Button variant="cancel" disabled={disabled} onClick={onDecline}>
          Decline
        </Button>
        <Button variant="emphasis" disabled={disabled} onClick={onAccept}>
          {busy ? 'Joining…' : 'Accept'}
        </Button>
      </Stack>
    </Stack>
  </Box>
)

export const PendingOnlineMatchInvitesBanner = () => {
  const navigate = useNavigate()
  const { invites, removeInvite, refetch } = usePendingOnlineMatchInvites()
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState(false)
  const acceptLockRef = useRef(false)

  if (invites.length === 0) {
    return null
  }

  const { visible: visibleInvites, hiddenCount } = selectVisiblePendingInvites(invites, expanded)

  const handleDecline = async (invite: PendingOnlineMatchInvite) => {
    if (busyInviteId !== null) {
      return
    }

    setBusyInviteId(invite.inviteId)
    setErrors((current) => {
      const next = { ...current }
      delete next[invite.inviteId]
      return next
    })

    try {
      await respondOnlineMatchInvite(invite.inviteId, false)
      removeInvite(invite.inviteId)
    } catch (declineError) {
      setErrors((current) => ({
        ...current,
        [invite.inviteId]:
          declineError instanceof InviteApiError
            ? declineError.message
            : 'Unable to decline invite.',
      }))
      void refetch()
    } finally {
      setBusyInviteId(null)
    }
  }

  const handleAccept = async (invite: PendingOnlineMatchInvite) => {
    if (acceptLockRef.current || busyInviteId !== null) {
      return
    }

    acceptLockRef.current = true
    setBusyInviteId(invite.inviteId)
    setErrors((current) => {
      const next = { ...current }
      delete next[invite.inviteId]
      return next
    })

    try {
      const inProgress = await getMyInProgressOnlineMatch()
      if (inProgress !== null && inProgress.id !== invite.matchId) {
        setErrors((current) => ({
          ...current,
          [invite.inviteId]:
            'You already have an in-progress online match. Finish or leave it before accepting.',
        }))
        return
      }

      const accepted = await respondOnlineMatchInvite(invite.inviteId, true)
      if (
        accepted.outcome !== OnlineMatchInviteOutcome.AcceptedForJoin ||
        accepted.inviteToken === null
      ) {
        throw new InviteApiError('This invite is no longer available.', 'not_joinable')
      }

      const joined = await joinMatch(accepted.matchId, accepted.inviteToken)
      removeInvite(invite.inviteId)
      void navigate(buildMatchPath(joined.matchId), { replace: true })
    } catch (acceptError) {
      const message =
        acceptError instanceof MatchServerApiError && acceptError.code === 'conflict'
          ? 'You already have an in-progress online match.'
          : acceptError instanceof InviteApiError || acceptError instanceof MatchServerApiError
            ? acceptError.message
            : 'Unable to accept invite.'

      setErrors((current) => ({
        ...current,
        [invite.inviteId]: message,
      }))
      void refetch()
    } finally {
      acceptLockRef.current = false
      setBusyInviteId(null)
    }
  }

  return (
    <Box px={{ base: 4, md: 6 }} pt={4}>
      <Stack gap={3}>
        {visibleInvites.map((invite) => (
          <InviteCard
            key={invite.inviteId}
            invite={invite}
            disabled={busyInviteId !== null}
            busy={busyInviteId === invite.inviteId}
            error={errors[invite.inviteId] ?? null}
            onAccept={() => {
              void handleAccept(invite)
            }}
            onDecline={() => {
              void handleDecline(invite)
            }}
          />
        ))}
        {!expanded && hiddenCount > 0 ? (
          <Button
            variant="cancel"
            alignSelf="flex-start"
            onClick={() => {
              setExpanded(true)
            }}
          >
            Show {String(hiddenCount)} more invite{hiddenCount === 1 ? '' : 's'}
          </Button>
        ) : null}
      </Stack>
    </Box>
  )
}
