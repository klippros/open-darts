import { Box, Input, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock'
import type { ClaimTheBoardConfig } from '@open-darts/game/types/claimTheBoard'
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
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'

const AIM_MODES = [
  AroundTheClockAimMode.Singles,
  AroundTheClockAimMode.Doubles,
  AroundTheClockAimMode.Trebles,
  AroundTheClockAimMode.Any,
] as const

export const ClaimTheBoardSetupPage = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [aimMode, setAimMode] = useState<AroundTheClockAimMode>(AroundTheClockAimMode.Any)
  const [guestName, setGuestName] = useState('')
  const [startingPlayerIndex, setStartingPlayerIndex] = useState(STARTING_PLAYER_INDEX_RANDOM)

  const primaryPlayerLabel = resolveHumanPlayerName(profile?.displayName)
  const opponentLabel = guestName.trim() || 'Guest'

  const handleStart = () => {
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
          description="Share one target with your opponent. Score face-value hits from 1 to the finish — 25/bull for singles or any, bull only for doubles or trebles."
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

        <SetupPageActions
          primaryLabel="Start game"
          onBack={() => void navigate('/')}
          onPrimary={handleStart}
        />
      </Stack>
    </SetupPageLayout>
  )
}
