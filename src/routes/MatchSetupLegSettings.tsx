import { Box, Stack, Text } from '@chakra-ui/react'
import { getChallengeMaxLegs } from '../lib/game/challenge'
import { clampLegsToWin, getMaxPossibleLegs } from '../lib/game/matchLegs'
import type { OpponentSetup } from '../lib/game/opponentSetup'
import { resolveHumanPlayerName } from '../lib/game/playerFactory'
import { useAuth } from '../hooks/authContext'
import { DEFAULT_LEGS_TO_WIN, LEGS_TO_WIN_MAX, LEGS_TO_WIN_MIN } from '../types/match'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

interface MatchSetupLegSettingsProps {
  setup: OpponentSetup
  opponentStarterLabel: string
  onSetupChange: (update: (current: OpponentSetup) => OpponentSetup) => void
}

export const MatchSetupLegSettings = ({
  setup,
  opponentStarterLabel,
  onSetupChange,
}: MatchSetupLegSettingsProps) => {
  const { profile } = useAuth()
  const primaryPlayerLabel = resolveHumanPlayerName(profile?.displayName)
  const legCount = clampLegsToWin(setup.legsToWin ?? DEFAULT_LEGS_TO_WIN)
  const isSolo = setup.mode === 'solo'
  const isChallenge = setup.mode === 'challenge'
  const maxLegs = isSolo
    ? legCount
    : isChallenge
      ? getChallengeMaxLegs(legCount)
      : getMaxPossibleLegs(legCount, 2)

  return (
    <>
      <Stack gap={3}>
        <Stack gap={1}>
          <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
            {isSolo ? 'Legs to play' : 'First to'}
          </Text>
          <Text color="whiteAlpha.600" fontSize="sm" lineHeight="1.55">
            {isSolo
              ? `Play ${legCount} leg${legCount === 1 ? '' : 's'} in this session.`
              : isChallenge
                ? `Win the match by taking ${legCount} legs within the visit limit before ${legCount} losses.`
                : `Win the match by taking this many legs first. A close match can take up to ${maxLegs} legs.`}
          </Text>
        </Stack>
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
                {legCount}
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
              value={legCount}
              style={rangeInputStyle}
              aria-label={isSolo ? 'Legs to play' : 'Legs to win'}
              onChange={(event) => {
                onSetupChange((current) => ({
                  ...current,
                  legsToWin: clampLegsToWin(Number(event.target.value)),
                }))
              }}
            />
          </Stack>
        </Box>
      </Stack>

      {!isSolo && !isChallenge && (
        <Stack gap={3}>
          <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
            First throw
          </Text>
          <Stack gap={2}>
            <SetupOptionCard
              label={primaryPlayerLabel}
              description={`${primaryPlayerLabel} throws first in leg 1`}
              selected={setup.startingPlayerIndex === 0}
              onSelect={() => {
                onSetupChange((current) => ({ ...current, startingPlayerIndex: 0 }))
              }}
            />
            <SetupOptionCard
              label={opponentStarterLabel}
              description={`${opponentStarterLabel} throws first in leg 1`}
              selected={setup.startingPlayerIndex === 1}
              onSelect={() => {
                onSetupChange((current) => ({ ...current, startingPlayerIndex: 1 }))
              }}
            />
          </Stack>
          <Text fontSize="sm" color="whiteAlpha.600" lineHeight="1.55">
            Starters alternate each leg after the first.
          </Text>
        </Stack>
      )}
    </>
  )
}
