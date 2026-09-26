import { Box, Input, Stack, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { ResumeOnlineMatchBanner } from '../components/ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'
import { SignInDialog } from '../components/SignInDialog/SignInDialog'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { ClaimTheBoardConfig } from '@open-darts/game/types/claimTheBoard'
import { GameModeId } from '@open-darts/game/types/gameMode'
import {
  getAroundTheClockAimModeDescription,
  getAroundTheClockAimModeLabel,
} from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { buildClaimTheBoardGamePath } from '@open-darts/game/claimTheBoard/claimTheBoardConfig'
import {
  resolveStartingPlayerIndex,
  STARTING_PLAYER_INDEX_RANDOM,
} from '@open-darts/game/game/matchLegs'
import { useAuth } from '../hooks/authContext'
import { useCreateOnlineMatch } from '../hooks/useCreateOnlineMatch'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import {
  isOnlinePlaySelected,
  ONLINE_PLAY_QUERY_KEY,
  ONLINE_PLAY_QUERY_VALUE,
  startingPlayerIndexToMatchSlot,
} from '../lib/matchServer/onlineSetup'

const AIM_MODES = [
  AroundTheClockAimMode.Singles,
  AroundTheClockAimMode.Doubles,
  AroundTheClockAimMode.Trebles,
  AroundTheClockAimMode.Any,
] as const

type ClaimTheBoardPlayMode = 'guest' | 'online'

export const ClaimTheBoardSetupPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const [aimMode, setAimMode] = useState<AroundTheClockAimMode>(AroundTheClockAimMode.Any)
  const [guestName, setGuestName] = useState('')
  const [startingPlayerIndex, setStartingPlayerIndex] = useState(STARTING_PLAYER_INDEX_RANDOM)
  const [playMode, setPlayMode] = useState<ClaimTheBoardPlayMode>(() =>
    isOnlineMatchesEnabled && isOnlinePlaySelected(searchParams) ? 'online' : 'guest',
  )
  const {
    createLobby,
    submitting,
    error,
    signInOpen,
    setSignInOpen,
    inProgressMatch,
    dismissCancelledMatch,
    isAuthLoading,
    authReady,
    isAuthenticated,
  } = useCreateOnlineMatch()

  const primaryPlayerLabel = resolveHumanPlayerName(profile?.displayName)
  const isOnline = playMode === 'online' && isAuthenticated
  const blockedByExistingMatch = isOnline && inProgressMatch !== null
  const showGuest = !isOnline
  const opponentLabel = isOnline ? 'Opponent' : guestName.trim() || 'Guest'
  const signInReturnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams)
    params.set(ONLINE_PLAY_QUERY_KEY, ONLINE_PLAY_QUERY_VALUE)
    return `${location.pathname}?${params.toString()}`
  }, [location.pathname, searchParams])

  const handleStart = () => {
    if (blockedByExistingMatch) {
      return
    }

    if (isOnline) {
      const config: ClaimTheBoardConfig = { aimMode }
      void createLobby({
        mode: GameModeId.ClaimTheBoard,
        legsToWin: 1,
        startingPlayerSlot: startingPlayerIndexToMatchSlot(startingPlayerIndex),
        config,
      })
      return
    }

    const config: ClaimTheBoardConfig = { aimMode }
    const params = new URLSearchParams({
      opponent: 'guest',
      guestName: opponentLabel,
      starter: String(resolveStartingPlayerIndex(startingPlayerIndex, 2)),
      legs: '1',
    })

    void navigate(buildClaimTheBoardGamePath(config, params), { state: { explicitLaunch: true } })
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Claim the Board"
          description="Share one target with your opponent. Score face-value hits from 1 to the finish — 25/bull for singles or any, bull only for doubles or trebles. Highest score wins; on a tie, the player who hits the finish wins."
        />

        <SetupSection title="Aim mode">
          <Stack gap={2}>
            {AIM_MODES.map((mode) => (
              <SetupOptionCard
                key={mode}
                label={getAroundTheClockAimModeLabel(mode)}
                description={getAroundTheClockAimModeDescription(mode)}
                selected={aimMode === mode}
                onSelect={() => {
                  setAimMode(mode)
                }}
              />
            ))}
          </Stack>
        </SetupSection>

        {isOnlineMatchesEnabled ? (
          <SetupSection title="Opponent">
            <Stack gap={2}>
              <SetupOptionCard
                label="Guest"
                description="Pass the device to a second player"
                selected={showGuest}
                onSelect={() => {
                  setPlayMode('guest')
                }}
              />
              {authReady && !isAuthenticated ? (
                <SetupOptionCard
                  label="Sign in to play online"
                  description="Create a match and share an invite"
                  selected={false}
                  showLiveIndicator
                  onSelect={() => {
                    setSignInOpen(true)
                  }}
                />
              ) : (
                <SetupOptionCard
                  label="Online"
                  description="Invite a signed-in opponent over the internet"
                  selected={isOnline}
                  showLiveIndicator
                  onSelect={() => {
                    setPlayMode('online')
                  }}
                />
              )}
            </Stack>
          </SetupSection>
        ) : null}

        {blockedByExistingMatch && inProgressMatch !== null ? (
          <ResumeOnlineMatchBanner
            match={inProgressMatch}
            stacked
            onCancelled={() => {
              dismissCancelledMatch(inProgressMatch.id)
            }}
          />
        ) : null}

        {showGuest && (
          <SetupSection title="Guest name">
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="whiteAlpha.50"
              px={4}
              py={4}
            >
              <Input
                value={guestName}
                onChange={(event) => {
                  setGuestName(event.target.value)
                }}
                placeholder="Guest"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.300"
                color="white"
              />
            </Box>
          </SetupSection>
        )}

        <SetupSection title="First throw">
          <Stack gap={2}>
            <SetupOptionCard
              label="Random"
              description="Coin flip who throws first"
              selected={startingPlayerIndex === STARTING_PLAYER_INDEX_RANDOM}
              onSelect={() => {
                setStartingPlayerIndex(STARTING_PLAYER_INDEX_RANDOM)
              }}
            />
            <SetupOptionCard
              label={primaryPlayerLabel}
              description={`${primaryPlayerLabel} throws first`}
              selected={startingPlayerIndex === 0}
              onSelect={() => {
                setStartingPlayerIndex(0)
              }}
            />
            <SetupOptionCard
              label={opponentLabel}
              description={`${opponentLabel} throws first`}
              selected={startingPlayerIndex === 1}
              onSelect={() => {
                setStartingPlayerIndex(1)
              }}
            />
          </Stack>
        </SetupSection>

        {error !== null && (
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        )}

        <SetupPageActions
          primaryLabel={
            isOnline ? (submitting || isAuthLoading ? 'Creating…' : 'Create lobby') : 'Start game'
          }
          primaryDisabled={blockedByExistingMatch || (isOnline && (submitting || isAuthLoading))}
          onBack={() => void navigate('/')}
          onPrimary={() => {
            if (!submitting && !(isOnline && isAuthLoading) && !blockedByExistingMatch) {
              handleStart()
            }
          }}
        />
      </Stack>
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        returnTo={signInReturnTo}
        title="Sign in to play online"
        description="Online matches need a signed-in account. After you sign in, you can create a lobby and invite an opponent."
      />
    </SetupPageLayout>
  )
}
