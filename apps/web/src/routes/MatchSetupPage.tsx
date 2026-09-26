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
import {
  clampMaxVisits,
  formatChallengeTargetLabel,
  formatTargetThreeDartAverage,
  getMaxVisits,
  getMinVisits,
} from '@open-darts/game/game/challenge'
import { appendOpponentSetupParams, parseOpponentSetup } from '@open-darts/game/game/opponentSetup'
import type { OpponentMode, OpponentSetup } from '@open-darts/game/game/opponentSetup'
import { STARTING_PLAYER_INDEX_RANDOM } from '@open-darts/game/game/matchLegs'
import {
  formatX01StartScore,
  parseX01ConfigFromSearchParams,
} from '@open-darts/game/x01/x01Presets'
import { ChallengeLegEndMode } from '@open-darts/game/types/match'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { useCreateOnlineMatch } from '../hooks/useCreateOnlineMatch'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import {
  isOnlineCapableX01Config,
  isOnlinePlaySelected,
  ONLINE_PLAY_QUERY_KEY,
  ONLINE_PLAY_QUERY_VALUE,
  startingPlayerIndexToMatchSlot,
} from '../lib/matchServer/onlineSetup'
import { V1_ONLINE_X01_CONFIG } from '../lib/matchServer/types'
import { MatchSetupLegSettings } from './MatchSetupLegSettings'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

type MatchSetupPlayMode = OpponentMode | 'online'

const localOpponentOptions: { value: OpponentMode; label: string; description: string }[] = [
  { value: 'solo', label: 'Solo', description: 'Play on your own' },
  { value: 'guest', label: 'Guest', description: 'Pass the device to a second player' },
  {
    value: 'challenge',
    label: 'Challenge',
    description: 'Win legs by finishing within a visit limit',
  },
]

const legEndModeOptions: {
  value: ChallengeLegEndMode
  label: string
  description: string
}[] = [
  {
    value: ChallengeLegEndMode.PlayToCheckout,
    label: 'Play to checkout',
    description: 'Keep going after the limit; the leg counts as a loss if you checkout over it',
  },
  {
    value: ChallengeLegEndMode.StopAtLimit,
    label: 'Stop at limit',
    description: 'The leg ends as soon as you use all visits without checking out',
  },
]

export const MatchSetupPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const x01Config = useMemo(() => parseX01ConfigFromSearchParams(searchParams), [searchParams])
  const onlineAvailable = isOnlineMatchesEnabled && isOnlineCapableX01Config(x01Config)
  const [playMode, setPlayMode] = useState<MatchSetupPlayMode>(() => {
    if (onlineAvailable && isOnlinePlaySelected(searchParams)) {
      return 'online'
    }

    return parseOpponentSetup(searchParams, 2, x01Config.startScore).mode
  })
  const [setup, setSetup] = useState<OpponentSetup>(() => ({
    ...parseOpponentSetup(searchParams, 2, x01Config.startScore),
    startingPlayerIndex: STARTING_PLAYER_INDEX_RANDOM,
  }))
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

  const modeLabel = formatX01StartScore(x01Config)
  const minVisits = getMinVisits(x01Config.startScore)
  const maxVisitsLimit = getMaxVisits()
  const maxVisits = clampMaxVisits(setup.maxVisits, x01Config.startScore)
  const isOnline = playMode === 'online' && isAuthenticated
  const blockedByExistingMatch = isOnline && inProgressMatch !== null
  const activeLocalMode: OpponentMode = isOnline
    ? 'guest'
    : playMode === 'online'
      ? 'solo'
      : playMode
  const opponentStarterLabel = isOnline
    ? 'Opponent'
    : activeLocalMode === 'guest'
      ? setup.guestName.trim() || 'Guest'
      : 'Guest'
  const legSettingsSetup: OpponentSetup = { ...setup, mode: activeLocalMode }
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
      void createLobby({
        mode: GameModeId.X01,
        legsToWin: setup.legsToWin,
        startingPlayerSlot: startingPlayerIndexToMatchSlot(setup.startingPlayerIndex),
        config: { ...V1_ONLINE_X01_CONFIG },
      })
      return
    }

    const params = appendOpponentSetupParams(
      new URLSearchParams(searchParams),
      { ...setup, mode: activeLocalMode },
      x01Config.startScore,
    )

    void navigate(`/game?${params.toString()}`, { state: { explicitLaunch: true } })
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title={`${modeLabel} match setup`}
          description="Choose who you are playing against before the leg starts."
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
                  setSetup((current) => ({ ...current, mode: option.value }))
                }}
              />
            ))}
            {onlineAvailable ? (
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

        {activeLocalMode === 'guest' && !isOnline && (
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
                value={setup.guestName}
                onChange={(event) => {
                  setSetup((current) => ({ ...current, guestName: event.target.value }))
                }}
                placeholder="Guest"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.300"
                color="white"
              />
            </Box>
          </SetupSection>
        )}

        {activeLocalMode === 'challenge' && (
          <>
            <SetupSection
              title="Max visits per leg"
              description="Lower visits mean a higher average is needed. Find your level and tighten the limit as you improve."
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
                      {minVisits} visit{minVisits === 1 ? '' : 's'}
                    </Text>
                    <Text
                      color="white"
                      fontFamily="Archivo Black, sans-serif"
                      fontSize="2xl"
                      lineHeight="1"
                    >
                      {maxVisits}
                    </Text>
                    <Text color="whiteAlpha.700" fontSize="sm">
                      {maxVisitsLimit} visits
                    </Text>
                  </Stack>
                  <input
                    type="range"
                    min={minVisits}
                    max={maxVisitsLimit}
                    step={1}
                    value={maxVisits}
                    style={rangeInputStyle}
                    aria-label="Max visits per leg"
                    aria-valuetext={`${maxVisits} visits, requires about ${formatTargetThreeDartAverage(x01Config.startScore, maxVisits)} three dart average`}
                    onChange={(event) => {
                      setSetup((current) => ({
                        ...current,
                        maxVisits: clampMaxVisits(Number(event.target.value), x01Config.startScore),
                      }))
                    }}
                  />
                  <Stack gap={1}>
                    <Text fontSize="sm" color="white" lineHeight="1.55" textAlign="center">
                      Finish in {maxVisits} visit{maxVisits === 1 ? '' : 's'} (up to {maxVisits * 3}{' '}
                      darts)
                    </Text>
                    <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.55" textAlign="center">
                      Requires ~{formatTargetThreeDartAverage(x01Config.startScore, maxVisits)}{' '}
                      3-dart average
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.600" lineHeight="1.55" textAlign="center">
                      {formatChallengeTargetLabel(x01Config.startScore, maxVisits)}
                    </Text>
                  </Stack>
                </Stack>
              </Box>
            </SetupSection>

            <SetupSection title="When you miss the limit">
              <Stack gap={2}>
                {legEndModeOptions.map((option) => (
                  <SetupOptionCard
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={setup.legEndMode === option.value}
                    onSelect={() => {
                      setSetup((current) => ({ ...current, legEndMode: option.value }))
                    }}
                  />
                ))}
              </Stack>
            </SetupSection>
          </>
        )}

        <MatchSetupLegSettings
          setup={legSettingsSetup}
          opponentStarterLabel={opponentStarterLabel}
          onSetupChange={setSetup}
        />

        {error !== null && (
          <Text color="red.300" fontSize="sm">
            {error}
          </Text>
        )}

        <SetupPageActions
          primaryLabel={
            isOnline ? (submitting || isAuthLoading ? 'Creating…' : 'Create lobby') : 'Start match'
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
