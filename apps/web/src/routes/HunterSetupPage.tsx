import { Stack, Text } from '@chakra-ui/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupFirstThrowSection } from '../components/SetupPageLayout/SetupFirstThrowSection'
import { SetupGuestNameSection } from '../components/SetupPageLayout/SetupGuestNameSection'
import { SetupGuestOnlineOpponentSection } from '../components/SetupPageLayout/SetupGuestOnlineOpponentSection'
import { SetupOnlineSignInDialog } from '../components/SetupPageLayout/SetupOnlineSignInDialog'
import { useMatchSetupSession } from '../components/SetupPageLayout/useMatchSetupSession'
import { ResumeOnlineMatchBanner } from '../components/ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'
import type { HunterConfig } from '@open-darts/game/types/hunter'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { buildHunterGamePath } from '@open-darts/game/hunter/hunterConfig'
import { resolveStartingPlayerIndex } from '@open-darts/game/game/matchLegs'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import {
  isOnlinePlaySelected,
  startingPlayerIndexToMatchSlot,
} from '../lib/matchServer/onlineSetup'

export const HunterSetupPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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

    const resolvedStarter = resolveStartingPlayerIndex(session.startingPlayerIndex, 2)
    const config: HunterConfig = { startingPlayerIndex: resolvedStarter }

    if (session.isOnline) {
      void session.createLobby({
        mode: GameModeId.Hunter,
        legsToWin: 1,
        startingPlayerSlot: startingPlayerIndexToMatchSlot(session.startingPlayerIndex),
        config,
      })
      return
    }

    const params = new URLSearchParams({
      opponent: 'guest',
      guestName: session.opponentLabel,
      starter: String(resolvedStarter),
      legs: '1',
    })

    void navigate(buildHunterGamePath(config, params), { state: { explicitLaunch: true } })
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Hunter"
          description="One player starts on 1, the other on 19. Hit your number — single advances one field, double two, treble three — and race clockwise around the board. Land on or pass your opponent to win."
        />

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
          randomDescription="Coin flip who throws first (starts on 1)"
          primaryDescription={`${session.primaryPlayerLabel} throws first and starts on 1`}
          opponentDescription={`${session.opponentLabel} throws first and starts on 1`}
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
