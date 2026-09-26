import { Box, Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../hooks/authContext'
import { buildMatchPath, MatchServerApiError } from '../../lib/matchServer/api'
import { cancelOnlineWaitingMatch } from '../../lib/matchServer/onlineMatchCancel'
import type { InProgressOnlineMatchRow } from '../../lib/matchServer/types'
import { MatchStatus } from '../../lib/matchServer/types'

export interface ResumeOnlineMatchBannerProps {
  match: InProgressOnlineMatchRow
  /** When provided, waiting lobbies show a Cancel action that clears the lobby in place. */
  onCancelled?: () => void
  /** Stack title, subtitle, then buttons (used on match setup). */
  stacked?: boolean
}

export const ResumeOnlineMatchBanner = ({
  match,
  onCancelled,
  stacked = false,
}: ResumeOnlineMatchBannerProps) => {
  const { user } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isWaiting = match.status === MatchStatus.Waiting
  const label = isWaiting ? 'waiting room' : 'online match'
  const canCancel = onCancelled !== undefined && isWaiting && user !== null

  const handleCancel = async () => {
    if (user === null || cancelling) {
      return
    }

    setCancelling(true)
    setError(null)

    try {
      await cancelOnlineWaitingMatch(match.id, user.id)
      onCancelled?.()
    } catch (cancelError) {
      const message =
        cancelError instanceof MatchServerApiError
          ? cancelError.message
          : 'Unable to cancel online match'
      setError(message)
    } finally {
      setCancelling(false)
    }
  }

  const actions = (
    <Stack
      direction={stacked ? 'row' : { base: 'column', sm: 'row' }}
      gap={2}
      flexShrink={0}
      flexWrap="wrap"
      justify={stacked ? 'flex-end' : undefined}
      alignSelf={stacked ? 'stretch' : undefined}
    >
      {canCancel ? (
        <Button
          variant="cancel"
          disabled={cancelling}
          onClick={() => {
            void handleCancel()
          }}
        >
          {cancelling ? 'Cancelling…' : 'Cancel lobby'}
        </Button>
      ) : null}
      <Button asChild variant="emphasis">
        <RouterLink to={buildMatchPath(match.id)}>
          {isWaiting ? 'Return to lobby' : 'Return to match'}
        </RouterLink>
      </Button>
    </Stack>
  )

  const copy = (
    <Stack gap={1} flex="1">
      <Text fontWeight="semibold" color="white">
        You already have an online {label}
      </Text>
      <Text fontSize="sm" color="whiteAlpha.700">
        {isWaiting
          ? 'Return to it or cancel the lobby before creating another online match.'
          : 'Finish or leave it before starting another online match.'}
      </Text>
    </Stack>
  )

  return (
    <Box
      borderWidth="1px"
      borderColor="orange.300"
      borderRadius="lg"
      bg="rgba(246, 173, 85, 0.14)"
      px={5}
      py={4}
    >
      <Stack gap={3}>
        {stacked ? (
          <>
            {copy}
            {actions}
          </>
        ) : (
          <Stack gap={3} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }}>
            {copy}
            {actions}
          </Stack>
        )}
        {error !== null ? (
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Box>
  )
}
