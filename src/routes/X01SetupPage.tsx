import { Box, Button, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { buildX01CustomGamePath } from '../lib/x01/x01Presets'
import type { X01Config } from '../types/x01'

const parseStartScoreInput = (value: string): number | null => {
  const trimmed = value.trim()

  if (trimmed === '') {
    return null
  }

  const parsed = Number(trimmed)

  if (!Number.isInteger(parsed) || parsed < 2 || parsed > 999) {
    return null
  }

  return parsed
}

export const X01SetupPage = () => {
  const navigate = useNavigate()
  const [startScoreInput, setStartScoreInput] = useState('501')
  const [doubleIn, setDoubleIn] = useState(false)
  const [doubleOut, setDoubleOut] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleStart = () => {
    const startScore = parseStartScoreInput(startScoreInput)

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
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="480px">
        <Stack gap={6}>
          <Stack gap={2}>
            <Heading as="h1" size="xl" color="white" fontFamily="Archivo Black, sans-serif">
              Custom x01
            </Heading>
            <Text color="whiteAlpha.700" fontSize="md" lineHeight="1.65">
              Pick a start score and optional double-in or straight-out rules, then start playing
              right away.
            </Text>
          </Stack>

          <Stack gap={4}>
            <Stack gap={2}>
              <Text color="whiteAlpha.800" fontSize="sm">
                Start score
              </Text>
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

            <Button
              variant={doubleIn ? 'emphasis' : 'cta'}
              justifyContent="flex-start"
              onClick={() => {
                setDoubleIn((current) => !current)
              }}
            >
              Double in {doubleIn ? 'on' : 'off'}
            </Button>

            <Button
              variant={doubleOut ? 'emphasis' : 'cta'}
              justifyContent="flex-start"
              onClick={() => {
                setDoubleOut((current) => !current)
              }}
            >
              Double out {doubleOut ? 'on' : 'off'}
            </Button>
          </Stack>

          <Stack direction={{ base: 'column', sm: 'row' }} gap={3}>
            <Button variant="emphasis" onClick={handleStart}>
              Start game
            </Button>
            <Button variant="cancel" onClick={() => void navigate('/')}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Box>
    </ContentContainer>
  )
}
