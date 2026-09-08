import { Box, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { useAuth } from '../hooks/authContext'
import { useInProgressOnlineMatch } from '../hooks/useInProgressOnlineMatch'
import { AuthStatus } from '../types/auth'
import { buildMatchPath, createMatch, MatchServerApiError } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { MatchPlayerSlot } from '../lib/matchServer/types'
import { clampLegsToWin } from '@open-darts/game/game/matchLegs'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'
import { DEFAULT_LEGS_TO_WIN, LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '@open-darts/game/types/match'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

export const OnlineMatchNewPage = () => {
  const navigate = useNavigate()
  const { authStatus, profile, user } = useAuth()
  const inProgress = useInProgressOnlineMatch()
  const [legsToWin, setLegsToWin] = useState(DEFAULT_LEGS_TO_WIN)
  const [startingPlayerSlot, setStartingPlayerSlot] = useState(MatchPlayerSlot.Creator)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOnlineMatchesEnabled) {
    return <Navigate to="/" replace />
  }

  if (
    authStatus === AuthStatus.Loading ||
    inProgress.status === 'idle' ||
    inProgress.status === 'loading'
  ) {
    return (
      <SetupPageLayout>
        <Text color="whiteAlpha.700">Loading…</Text>
      </SetupPageLayout>
    )
  }

  if (authStatus !== AuthStatus.Authenticated || user === null) {
    return <Navigate to="/" replace />
  }

  if (inProgress.status === 'ready' && inProgress.match !== null) {
    return <Navigate to={buildMatchPath(inProgress.match.id)} replace />
  }

  const primaryPlayerLabel = resolveHumanPlayerName(profile?.displayName)

  const handleCreate = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const created = await createMatch(clampLegsToWin(legsToWin), startingPlayerSlot)
      void navigate(buildMatchPath(created.matchId), { replace: true })
    } catch (createError) {
      if (createError instanceof MatchServerApiError && createError.code === 'conflict') {
        setError(
          'You already have an in-progress online match. Return to it before creating another.',
        )
      } else {
        const message =
          createError instanceof MatchServerApiError
            ? createError.message
            : 'Unable to create online match'
        setError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Online 501"
          description="Create a two-player double-out match and invite an opponent."
        />

        <SetupSection title="First to" description="Win the match by taking this many legs first.">
          <Box
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            bg="whiteAlpha.50"
            px={4}
            py={4}
          >
            <Stack gap={3}>
              <Stack direction="row" justify="space-between" align="center">
                <Text color="whiteAlpha.700" fontSize="sm">
                  {LEGS_TO_WIN_MIN} leg
                </Text>
                <Text
                  color="white"
                  fontFamily="Archivo Black, sans-serif"
                  fontSize="2xl"
                  lineHeight="1"
                >
                  {legsToWin}
                </Text>
                <Text color="whiteAlpha.700" fontSize="sm">
                  {LEGS_TO_WIN_MAX} legs
                </Text>
              </Stack>
              <input
                type="range"
                min={LEGS_TO_WIN_MIN}
                max={LEGS_TO_WIN_MAX}
                step={1}
                value={legsToWin}
                style={rangeInputStyle}
                aria-label="Legs to win"
                onChange={(event) => {
                  setLegsToWin(clampLegsToWin(Number(event.target.value)))
                }}
              />
            </Stack>
          </Box>
        </SetupSection>

        <SetupSection title="First throw">
          <Stack gap={2}>
            <SetupOptionCard
              label={primaryPlayerLabel}
              description={`${primaryPlayerLabel} throws first in leg 1`}
              selected={startingPlayerSlot === MatchPlayerSlot.Creator}
              onSelect={() => {
                setStartingPlayerSlot(MatchPlayerSlot.Creator)
              }}
            />
            <SetupOptionCard
              label="Opponent"
              description="Opponent throws first in leg 1"
              selected={startingPlayerSlot === MatchPlayerSlot.Joiner}
              onSelect={() => {
                setStartingPlayerSlot(MatchPlayerSlot.Joiner)
              }}
            />
          </Stack>
          <Text fontSize="sm" color="whiteAlpha.600" lineHeight="1.55">
            Starters alternate each leg after the first.
          </Text>
        </SetupSection>

        {error !== null && (
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        )}

        <SetupPageActions
          primaryLabel={submitting ? 'Creating…' : 'Create match'}
          onBack={() => {
            void navigate('/')
          }}
          onPrimary={() => {
            if (!submitting) {
              void handleCreate()
            }
          }}
        />
      </Stack>
    </SetupPageLayout>
  )
}
