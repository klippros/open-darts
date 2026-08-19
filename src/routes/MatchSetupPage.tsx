import { Box, Input, Stack, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import {
  clampMaxVisits,
  formatChallengeTargetLabel,
  formatTargetThreeDartAverage,
  getMaxVisits,
  getMinVisits,
} from '../lib/game/challenge'
import { appendOpponentSetupParams, parseOpponentSetup } from '../lib/game/opponentSetup'
import type { OpponentMode, OpponentSetup } from '../lib/game/opponentSetup'
import { formatX01StartScore, parseX01ConfigFromSearchParams } from '../lib/x01/x01Presets'
import { ChallengeLegEndMode } from '../types/match'
import { MatchSetupLegSettings } from './MatchSetupLegSettings'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

const opponentOptions: { value: OpponentMode; label: string; description: string }[] = [
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
  const [searchParams] = useSearchParams()
  const x01Config = useMemo(() => parseX01ConfigFromSearchParams(searchParams), [searchParams])
  const [setup, setSetup] = useState<OpponentSetup>(() =>
    parseOpponentSetup(searchParams, 2, x01Config.startScore),
  )
  const [guestNameError, setGuestNameError] = useState<string | null>(null)

  const modeLabel = formatX01StartScore(x01Config)
  const minVisits = getMinVisits(x01Config.startScore)
  const maxVisitsLimit = getMaxVisits()
  const maxVisits = clampMaxVisits(setup.maxVisits, x01Config.startScore)
  const opponentStarterLabel = setup.mode === 'guest' ? setup.guestName.trim() || 'Guest' : 'Guest'

  const handleStart = () => {
    if (setup.mode === 'guest' && setup.guestName.trim() === '') {
      setGuestNameError('Enter a name for your guest opponent.')
      return
    }

    const params = appendOpponentSetupParams(
      new URLSearchParams(searchParams),
      setup,
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
            {opponentOptions.map((option) => (
              <SetupOptionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={setup.mode === option.value}
                onSelect={() => {
                  setSetup((current) => ({ ...current, mode: option.value }))
                  setGuestNameError(null)
                }}
              />
            ))}
          </Stack>
        </SetupSection>

        {setup.mode === 'guest' && (
          <SetupSection title="Guest name">
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="whiteAlpha.50"
              px={4}
              py={4}
            >
              <Stack gap={2}>
                <Input
                  value={setup.guestName}
                  onChange={(event) => {
                    setSetup((current) => ({ ...current, guestName: event.target.value }))
                    setGuestNameError(null)
                  }}
                  placeholder="Guest name"
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.300"
                  color="white"
                />
                {guestNameError !== null && (
                  <Text color="red.300" fontSize="sm">
                    {guestNameError}
                  </Text>
                )}
              </Stack>
            </Box>
          </SetupSection>
        )}

        {setup.mode === 'challenge' && (
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
          setup={setup}
          opponentStarterLabel={opponentStarterLabel}
          onSetupChange={setSetup}
        />

        <SetupPageActions
          primaryLabel="Start match"
          onBack={() => void navigate('/')}
          onPrimary={handleStart}
        />
      </Stack>
    </SetupPageLayout>
  )
}
