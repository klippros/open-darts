import { Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { SetupFirstThrowSection } from '../components/SetupPageLayout/SetupFirstThrowSection'
import { SetupGuestNameSection } from '../components/SetupPageLayout/SetupGuestNameSection'
import { SetupGuestOnlineOpponentSection } from '../components/SetupPageLayout/SetupGuestOnlineOpponentSection'
import { SetupOnlineSignInDialog } from '../components/SetupPageLayout/SetupOnlineSignInDialog'
import { useMatchSetupSession } from '../components/SetupPageLayout/useMatchSetupSession'
import { ResumeOnlineMatchBanner } from '../components/ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { ClaimTheBoardConfig } from '@open-darts/game/types/claimTheBoard'
import { GameModeId } from '@open-darts/game/types/gameMode'
import {
  getAroundTheClockAimModeDescription,
  getAroundTheClockAimModeLabel,
} from '@open-darts/game/aroundTheClock/aroundTheClockConfig'
import { buildClaimTheBoardGamePath } from '@open-darts/game/claimTheBoard/claimTheBoardConfig'
import { resolveStartingPlayerIndex } from '@open-darts/game/game/matchLegs'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import {
  isOnlinePlaySelected,
  startingPlayerIndexToMatchSlot,
} from '../lib/matchServer/onlineSetup'

const AIM_MODES = [
  AroundTheClockAimMode.Singles,
  AroundTheClockAimMode.Doubles,
  AroundTheClockAimMode.Trebles,
  AroundTheClockAimMode.Any,
] as const

export const ClaimTheBoardSetupPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [aimMode, setAimMode] = useState<AroundTheClockAimMode>(AroundTheClockAimMode.Any)
  const session = useMatchSetupSession({
    initialPlayMode:
      isOnlineMatchesEnabled && isOnlinePlaySelected(searchParams) ? 'online' : 'guest',
  })
  const showGuest = !session.isOnline
  const inProgressMatch = session.inProgressMatch

  const handleStart = () => {
    if (session.blockedByExistingMatch) {
      return
    }

    const config: ClaimTheBoardConfig = { aimMode }

    if (session.isOnline) {
      void session.createLobby({
        mode: GameModeId.ClaimTheBoard,
        legsToWin: 1,
        startingPlayerSlot: startingPlayerIndexToMatchSlot(session.startingPlayerIndex),
        config,
      })
      return
    }

    const params = new URLSearchParams({
      opponent: 'guest',
      guestName: session.opponentLabel,
      starter: String(resolveStartingPlayerIndex(session.startingPlayerIndex, 2)),
      legs: '1',
    })

    void navigate(buildClaimTheBoardGamePath(config, params), { state: { explicitLaunch: true } })
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Claim the Board"
          description="Share one target with your opponent. Each hit scores the segment face value (1–20), or 25 for bull — even in doubles and trebles. Highest score wins; on a tie, the player who hits the finish wins."
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

        <SetupGuestOnlineOpponentSection
          showGuest={showGuest}
          isOnline={session.isOnline}
          authReady={session.authReady}
          isAuthenticated={session.isAuthenticated}
          onSelectGuest={() => {
            session.setPlayMode('guest')
          }}
          onSelectOnline={() => {
            session.setPlayMode('online')
          }}
          onRequestSignIn={() => {
            session.setSignInOpen(true)
          }}
        />

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

        <SetupFirstThrowSection
          startingPlayerIndex={session.startingPlayerIndex}
          onStartingPlayerIndexChange={(value) => {
            session.setStartingPlayerIndex(value)
          }}
          primaryPlayerLabel={session.primaryPlayerLabel}
          opponentLabel={session.opponentLabel}
        />

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
