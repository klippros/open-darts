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
import { buildBullRunGamePath, getBullRunConfig } from '@open-darts/game/bullRun/bullRunConfig'
import {
  BULL_RUN_DEFAULT_TARGET_SCORE,
  BULL_RUN_TARGET_SCORE_MAX,
  BULL_RUN_TARGET_SCORE_MIN,
} from '@open-darts/game/bullRun/bullRunRules'
import { parseOpponentSetup } from '@open-darts/game/game/opponentSetup'
import type { OpponentMode } from '@open-darts/game/game/opponentSetup'
import {
  resolveStartingPlayerIndex,
  STARTING_PLAYER_INDEX_RANDOM,
} from '@open-darts/game/game/matchLegs'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { BullRunConfig } from '@open-darts/game/types/bullRun'
import { useAuth } from '../hooks/authContext'
import { useCreateOnlineMatch } from '../hooks/useCreateOnlineMatch'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import {
  isOnlinePlaySelected,
  ONLINE_PLAY_QUERY_KEY,
  ONLINE_PLAY_QUERY_VALUE,
  startingPlayerIndexToMatchSlot,
} from '../lib/matchServer/onlineSetup'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

type BullRunPlayMode = OpponentMode | 'online'

const localOpponentOptions: { value: OpponentMode; label: string; description: string }[] = [
  { value: 'solo', label: 'Solo', description: 'Play on your own' },
  { value: 'guest', label: 'Guest', description: 'Pass the device to a second player' },
]

export const BullRunSetupPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const [playMode, setPlayMode] = useState<BullRunPlayMode>(() => {
    if (isOnlineMatchesEnabled && isOnlinePlaySelected(searchParams)) {
      return 'online'
    }

    return parseOpponentSetup(searchParams, 2, 0).mode === 'guest' ? 'guest' : 'solo'
  })
  const [guestName, setGuestName] = useState(() => parseOpponentSetup(searchParams, 2, 0).guestName)
  const [startingPlayerIndex, setStartingPlayerIndex] = useState(STARTING_PLAYER_INDEX_RANDOM)
  const [targetScore, setTargetScore] = useState(BULL_RUN_DEFAULT_TARGET_SCORE)
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
  const activeLocalMode: OpponentMode = isOnline
    ? 'guest'
    : playMode === 'online'
      ? 'solo'
      : playMode
  const showGuest = activeLocalMode === 'guest' && !isOnline
  const showFirstThrow = activeLocalMode === 'guest' || isOnline
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

    const config: BullRunConfig = getBullRunConfig({ targetScore })

    if (isOnline) {
      void createLobby({
        mode: GameModeId.BullRun,
        legsToWin: 1,
        startingPlayerSlot: startingPlayerIndexToMatchSlot(startingPlayerIndex),
        config,
      })
      return
    }

    if (activeLocalMode === 'solo') {
      void navigate(buildBullRunGamePath(config), { state: { explicitLaunch: true } })
      return
    }

    const resolvedStarter = resolveStartingPlayerIndex(startingPlayerIndex, 2)
    const params = new URLSearchParams({
      opponent: 'guest',
      guestName: opponentLabel,
      starter: String(resolvedStarter),
      legs: '1',
    })

    void navigate(buildBullRunGamePath(config, params), { state: { explicitLaunch: true } })
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Bull Run"
          description="Race to a bull target. Outer bull scores 1, bullseye scores 2. First to the target wins."
        />

        <SetupSection title="Opponent">
          <Stack gap={2}>
            {localOpponentOptions.map((option) => (
              <SetupOptionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={activeLocalMode === option.value && !isOnline}
                onSelect={() => {
                  setPlayMode(option.value)
                }}
              />
            ))}
            {isOnlineMatchesEnabled ? (
              authReady && !isAuthenticated ? (
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
              )
            ) : null}
          </Stack>
        </SetupSection>

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

        <SetupSection
          title="Target"
          description="How many bull points to race to. Outer bull is 1, bullseye is 2."
        >
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
                  {BULL_RUN_TARGET_SCORE_MIN}
                </Text>
                <Text
                  color="white"
                  fontFamily="Archivo Black, sans-serif"
                  fontSize="2xl"
                  lineHeight="1"
                >
                  {targetScore}
                </Text>
                <Text color="whiteAlpha.700" fontSize="sm">
                  {BULL_RUN_TARGET_SCORE_MAX}
                </Text>
              </Stack>
              <input
                type="range"
                min={BULL_RUN_TARGET_SCORE_MIN}
                max={BULL_RUN_TARGET_SCORE_MAX}
                step={1}
                value={targetScore}
                style={rangeInputStyle}
                aria-label="Bull Run target score"
                onChange={(event) => {
                  setTargetScore(Number(event.target.value))
                }}
              />
            </Stack>
          </Box>
        </SetupSection>

        {showFirstThrow && (
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
        )}

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
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} returnTo={signInReturnTo} />
    </SetupPageLayout>
  )
}
