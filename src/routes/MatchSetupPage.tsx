import { Box, Button, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import {
  clampBotSkillLevel,
  formatBotEstimatedThreeDartAverage,
  getBotEstimatedThreeDartAverage,
} from '../lib/bots/botSkill'
import { appendOpponentSetupParams, parseOpponentSetup } from '../lib/game/opponentSetup'
import type { OpponentMode, OpponentSetup } from '../lib/game/opponentSetup'
import { formatX01StartScore, parseX01ConfigFromSearchParams } from '../lib/x01/x01Presets'
import { BOT_SKILL_LEVEL_MAX, BOT_SKILL_LEVEL_MIN } from '../types/player'
import { MatchSetupLegSettings } from './MatchSetupLegSettings'
import { MatchSetupOpponentOption } from './MatchSetupOpponentOption'

const rangeInputStyle = {
  width: '100%',
  accentColor: '#f6ad55',
  cursor: 'pointer',
} as const

const opponentOptions: { value: OpponentMode; label: string; description: string }[] = [
  { value: 'solo', label: 'Solo', description: 'Play on your own' },
  { value: 'guest', label: 'Guest', description: 'Pass the device to a second player' },
  { value: 'bot', label: 'Bot', description: 'Play against a computer opponent' },
]

export const MatchSetupPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const x01Config = useMemo(() => parseX01ConfigFromSearchParams(searchParams), [searchParams])
  const [setup, setSetup] = useState<OpponentSetup>(() => parseOpponentSetup(searchParams))
  const [guestNameError, setGuestNameError] = useState<string | null>(null)

  const modeLabel = formatX01StartScore(x01Config)
  const botAverageLabel = formatBotEstimatedThreeDartAverage(setup.botLevel)
  const opponentStarterLabel = setup.mode === 'guest' ? setup.guestName.trim() || 'Guest' : 'Bot'

  const handleStart = () => {
    if (setup.mode === 'guest' && setup.guestName.trim() === '') {
      setGuestNameError('Enter a name for your guest opponent.')
      return
    }

    const params = appendOpponentSetupParams(new URLSearchParams(searchParams), setup)

    void navigate(`/game?${params.toString()}`, { state: { explicitLaunch: true } })
  }

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="560px" w="full" mx="auto">
        <Stack gap={8}>
          <Stack gap={2}>
            <Heading as="h1" size="xl" color="white" fontFamily="Archivo Black, sans-serif">
              {modeLabel} match setup
            </Heading>
            <Text color="whiteAlpha.700" fontSize="md" lineHeight="1.65">
              Choose who you are playing against before the leg starts.
            </Text>
          </Stack>

          <Stack gap={3}>
            <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
              Opponent
            </Text>
            <Stack gap={2}>
              {opponentOptions.map((option) => (
                <MatchSetupOpponentOption
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
          </Stack>

          {setup.mode === 'guest' && (
            <Stack gap={2}>
              <Text color="whiteAlpha.800" fontSize="sm">
                Guest name
              </Text>
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
          )}

          {setup.mode === 'bot' && (
            <Stack gap={4}>
              <Stack gap={1}>
                <Text color="whiteAlpha.800" fontSize="sm" fontWeight="semibold">
                  Bot level
                </Text>
                <Text color="whiteAlpha.600" fontSize="sm" lineHeight="1.55">
                  Estimated 3-dart average:{' '}
                  <Text as="span" color="orange.200" fontWeight="semibold">
                    {botAverageLabel}
                  </Text>
                </Text>
              </Stack>

              <Stack gap={3}>
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
                        Level {BOT_SKILL_LEVEL_MIN}
                      </Text>
                      <Text
                        color="white"
                        fontFamily="Archivo Black, sans-serif"
                        fontSize="2xl"
                        lineHeight="1"
                      >
                        {setup.botLevel}
                      </Text>
                      <Text color="whiteAlpha.700" fontSize="sm">
                        Level {BOT_SKILL_LEVEL_MAX}
                      </Text>
                    </Stack>
                    <input
                      type="range"
                      min={BOT_SKILL_LEVEL_MIN}
                      max={BOT_SKILL_LEVEL_MAX}
                      step={1}
                      value={setup.botLevel}
                      style={rangeInputStyle}
                      aria-label="Bot level"
                      aria-valuetext={`Level ${setup.botLevel}, estimated ${botAverageLabel} three dart average`}
                      onChange={(event) => {
                        setSetup((current) => ({
                          ...current,
                          botLevel: clampBotSkillLevel(Number(event.target.value)),
                        }))
                      }}
                    />
                    <Text fontSize="sm" color="whiteAlpha.700" lineHeight="1.55" textAlign="center">
                      ~{getBotEstimatedThreeDartAverage(setup.botLevel)} 3-dart average at this
                      level
                    </Text>
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          )}

          <MatchSetupLegSettings
            setup={setup}
            opponentStarterLabel={opponentStarterLabel}
            onSetupChange={setSetup}
          />

          <Stack direction="row" justify="space-between" w="full" gap={3}>
            <Button variant="cancel" onClick={() => void navigate('/')}>
              Back
            </Button>
            <Button variant="emphasis" onClick={handleStart}>
              Start match
            </Button>
          </Stack>
        </Stack>
      </Box>
    </ContentContainer>
  )
}
