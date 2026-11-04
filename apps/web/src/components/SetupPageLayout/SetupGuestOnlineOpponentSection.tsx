import { Stack } from '@chakra-ui/react'
import { SetupOptionCard } from './SetupOptionCard'
import { SetupSection } from './SetupSection'
import { isOnlineMatchesEnabled } from '../../lib/matchServer/config'

export interface SetupGuestOnlineOpponentSectionProps {
  showGuest: boolean
  isOnline: boolean
  authReady: boolean
  isAuthenticated: boolean
  onSelectGuest: () => void
  onSelectOnline: () => void
  onRequestSignIn: () => void
}

export const SetupGuestOnlineOpponentSection = ({
  showGuest,
  isOnline,
  authReady,
  isAuthenticated,
  onSelectGuest,
  onSelectOnline,
  onRequestSignIn,
}: SetupGuestOnlineOpponentSectionProps) => {
  if (!isOnlineMatchesEnabled) {
    return null
  }

  return (
    <SetupSection title="Opponent">
      <Stack gap={2}>
        <SetupOptionCard
          label="Guest"
          description="Pass the device to a second player"
          selected={showGuest}
          onSelect={onSelectGuest}
        />
        {authReady && !isAuthenticated ? (
          <SetupOptionCard
            label="Sign in to play online"
            description="Create a match and share an invite"
            selected={false}
            showLiveIndicator
            onSelect={onRequestSignIn}
          />
        ) : (
          <SetupOptionCard
            label="Online"
            description="Invite a signed-in opponent over the internet"
            selected={isOnline}
            showLiveIndicator
            onSelect={onSelectOnline}
          />
        )}
      </Stack>
    </SetupSection>
  )
}
