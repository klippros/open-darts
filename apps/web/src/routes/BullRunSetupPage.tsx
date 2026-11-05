import { Box, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { SetupFirstThrowSection } from '../components/SetupPageLayout/SetupFirstThrowSection'
import { SetupGuestNameSection } from '../components/SetupPageLayout/SetupGuestNameSection'
import { SetupOnlineSignInDialog } from '../components/SetupPageLayout/SetupOnlineSignInDialog'
import { useMatchSetupSession } from '../components/SetupPageLayout/useMatchSetupSession'
import { ResumeOnlineMatchBanner } from '../components/ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'
import { buildBullRunGamePath, getBullRunConfig } from '@open-darts/game/bullRun/bullRunConfig'
import {
  BULL_RUN_DEFAULT_TARGET_SCORE,
  BULL_RUN_TARGET_SCORE_MAX,
  BULL_RUN_TARGET_SCORE_MIN,
} from '@open-darts/game/bullRun/bullRunRules'
import { parseOpponentSetup } from '@open-darts/game/game/opponentSetup'
import type { OpponentMode } from '@open-darts/game/game/opponentSetup'
import { resolveStartingPlayerIndex } from '@open-darts/game/game/matchLegs'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { BullRunConfig } from '@open-darts/game/types/bullRun'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import {
  isOnlinePlaySelected,
  startingPlayerIndexToMatchSlot,
} from '../lib/matchServer/onlineSetup'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

const localOpponentOptions: { value: OpponentMode; label: string; description: string }[] = [
  { value: 'solo', label: 'Solo', description: 'Play on your own' },
  { value: 'guest', label: 'Guest', description: 'Pass the device to a second player' },
]

const resolveBullRunLocalMode = (playMode: string, isOnline: boolean): OpponentMode => {
  if (isOnline || playMode === 'online') {
    return isOnline ? 'guest' : 'solo'
  }

  return playMode === 'guest' ? 'guest' : 'solo'
}

export const BullRunSetupPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const opponentSetup = parseOpponentSetup(searchParams, 2, 0)
  const [targetScore, setTargetScore] = useState(BULL_RUN_DEFAULT_TARGET_SCORE)
  const session = useMatchSetupSession({
    initialPlayMode:
      isOnlineMatchesEnabled && isOnlinePlaySelected(searchParams)
        ? 'online'
        : opponentSetup.mode === 'guest'
          ? 'guest'
          : 'solo',
    initialGuestName: opponentSetup.guestName,
  })

  const activeLocalMode = resolveBullRunLocalMode(session.playMode, session.isOnline)
  const showGuest = activeLocalMode === 'guest' && !session.isOnline
  const showFirstThrow = activeLocalMode === 'guest' || session.isOnline
  const inProgressMatch = session.inProgressMatch

  const handleStart = () => {
    if (session.blockedByExistingMatch) {
      return
    }

    const config: BullRunConfig = getBullRunConfig({ targetScore })

    if (session.isOnline) {
      void session.createLobby({
        mode: GameModeId.BullRun,
        legsToWin: 1,
        startingPlayerSlot: startingPlayerIndexToMatchSlot(session.startingPlayerIndex),
        config,
      })
      return
    }

    if (activeLocalMode === 'solo') {
      void navigate(buildBullRunGamePath(config), { state: { explicitLaunch: true } })
      return
    }

    const resolvedStarter = resolveStartingPlayerIndex(session.startingPlayerIndex, 2)
    const params = new URLSearchParams({
      opponent: 'guest',
      guestName: session.opponentLabel,
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
                selected={activeLocalMode === option.value && !session.isOnline}
                onSelect={() => {
                  session.setPlayMode(option.value)
                }}
              />
            ))}
            {isOnlineMatchesEnabled ? (
              session.authReady && !session.isAuthenticated ? (
                <SetupOptionCard
                  label="Sign in to play online"
                  description="Create a match and share an invite"
                  selected={false}
                  showLiveIndicator
                  onSelect={() => {
                    session.setSignInOpen(true)
                  }}
                />
              ) : (
                <SetupOptionCard
                  label="Online"
                  description="Invite a signed-in opponent over the internet"
                  selected={session.isOnline}
                  showLiveIndicator
                  onSelect={() => {
                    session.setPlayMode('online')
                  }}
                />
              )
            ) : null}
          </Stack>
        </SetupSection>

        {session.blockedByExistingMatch && inProgressMatch !== null ? (
          <ResumeOnlineMatchBanner
            match={inProgressMatch}
            stacked
            onCancelled={() => {
              session.dismissCancelledMatch(inProgressMatch.id)
            }}
          />
        ) : null}

        {showGuest && (
          <SetupGuestNameSection
            guestName={session.guestName}
            onGuestNameChange={(value) => {
              session.setGuestName(value)
            }}
          />
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
          <SetupFirstThrowSection
            startingPlayerIndex={session.startingPlayerIndex}
            onStartingPlayerIndexChange={(value) => {
              session.setStartingPlayerIndex(value)
            }}
            primaryPlayerLabel={session.primaryPlayerLabel}
            opponentLabel={session.opponentLabel}
          />
        )}

        {session.error !== null && (
          <Text color="red.300" fontSize="sm">
            {session.error}
          </Text>
        )}

        <SetupPageActions
          primaryLabel={session.primaryLabel}
          primaryDisabled={session.primaryDisabled}
          onBack={() => void navigate('/')}
          onPrimary={() => {
            if (session.canStart) {
              handleStart()
            }
          }}
        />
      </Stack>
      <SetupOnlineSignInDialog
        open={session.signInOpen}
        onOpenChange={(open) => {
          session.setSignInOpen(open)
        }}
        returnTo={session.signInReturnTo}
      />
    </SetupPageLayout>
  )
}
