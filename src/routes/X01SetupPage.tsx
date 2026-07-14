import { Box, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SetupPageActions } from '../components/SetupPageLayout/SetupPageActions'
import { SetupPageHeader } from '../components/SetupPageLayout/SetupPageHeader'
import { SetupPageLayout } from '../components/SetupPageLayout/SetupPageLayout'
import { SetupOptionCard } from '../components/SetupPageLayout/SetupOptionCard'
import { SetupSection } from '../components/SetupPageLayout/SetupSection'
import { buildX01CustomGamePath, parseOptionalStartScore } from '../lib/x01/x01Presets'
import type { X01Config } from '../types/x01'

export const X01SetupPage = () => {
  const navigate = useNavigate()
  const [startScoreInput, setStartScoreInput] = useState('501')
  const [doubleIn, setDoubleIn] = useState(false)
  const [doubleOut, setDoubleOut] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleStart = () => {
    const startScore = parseOptionalStartScore(startScoreInput)

    if (startScore === null) {
      setError('Enter a whole number between 2 and 999.')
      return
    }

    const config: X01Config = {
      startScore,
      doubleIn,
      doubleOut,
    }

    void navigate(buildX01CustomGamePath(config))
  }

  return (
    <SetupPageLayout>
      <Stack gap={8}>
        <SetupPageHeader
          title="Custom x01"
          description="Pick a start score and optional double-in or straight-out rules, then choose your opponent."
        />

        <SetupSection title="Start score">
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
                value={startScoreInput}
                onChange={(event) => {
                  setStartScoreInput(event.target.value)
                  setError(null)
                }}
                inputMode="numeric"
                placeholder="501"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.300"
                color="white"
              />
              {error !== null && (
                <Text color="red.300" fontSize="sm">
                  {error}
                </Text>
              )}
            </Stack>
          </Box>
        </SetupSection>

        <SetupSection title="Rules">
          <Stack gap={2}>
            <SetupOptionCard
              label="Double in"
              description="Require a double before scores count"
              selected={doubleIn}
              onSelect={() => {
                setDoubleIn((current) => !current)
              }}
            />
            <SetupOptionCard
              label="Double out"
              description="Must finish on a double or bull"
              selected={doubleOut}
              onSelect={() => {
                setDoubleOut((current) => !current)
              }}
            />
          </Stack>
        </SetupSection>

        <SetupPageActions
          primaryLabel="Continue"
          onBack={() => void navigate('/')}
          onPrimary={handleStart}
        />
      </Stack>
    </SetupPageLayout>
  )
}
