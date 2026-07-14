import { Box, Button, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { ResumeGameBanner } from '../components/ResumeGameBanner/ResumeGameBanner'
import { buildPracticeGamePath } from '../lib/game/gameRoute'
import { explicitGameLaunchState } from '../lib/routing/gameNavigation'
import { GameModeId } from '../types/gameMode'
import { buildX01PresetPath, X01PresetId } from '../lib/x01/x01Presets'

const MATCH_MODES = [
  {
    id: X01PresetId.FiveOhOne,
    label: '501',
    description: 'Classic double-out',
    to: buildX01PresetPath(X01PresetId.FiveOhOne),
  },
  {
    id: X01PresetId.FourOhOne,
    label: '401',
    description: 'Shorter x01 leg',
    to: buildX01PresetPath(X01PresetId.FourOhOne),
  },
  {
    id: X01PresetId.ThreeOhOne,
    label: '301',
    description: 'Quick x01 leg',
    to: buildX01PresetPath(X01PresetId.ThreeOhOne),
  },
  {
    id: 'custom-x01',
    label: 'Custom x01',
    description: 'Choose start score and rules',
    to: '/game/setup',
  },
] as const

const PRACTICE_MODES = [
  {
    id: 'bob',
    label: "Bob's 27",
    description: 'Doubles practice',
    to: buildPracticeGamePath(GameModeId.Bob27),
  },
  {
    id: '121',
    label: '121',
    description: 'Checkout practice',
    to: buildPracticeGamePath(GameModeId.OneTwentyOne),
  },
  {
    id: 'around-the-clock',
    label: 'Around the Clock',
    description: 'Hit 1 to 20 and bull',
    to: '/game/around-the-clock/setup',
  },
  {
    id: '10-up-1-down',
    label: '10 Up 1 Down',
    description: 'Checkout up or down',
    to: buildPracticeGamePath(GameModeId.TenUpOneDown),
  },
] as const

const ModeGrid = ({
  modes,
  explicitLaunch = false,
}: {
  modes: readonly { id: string; label: string; description: string; to: string }[]
  explicitLaunch?: boolean
}) => (
  <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
    {modes.map((mode) => {
      const link = (
        <>
          <Text fontSize="lg" fontWeight="semibold" color="white">
            {mode.label}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal">
            {mode.description}
          </Text>
        </>
      )

      return (
        <Button
          key={mode.id}
          asChild
          variant="cta"
          h="auto"
          py={5}
          px={5}
          flexDirection="column"
          alignItems="flex-start"
          gap={1}
          textAlign="left"
        >
          {explicitLaunch ? (
            <RouterLink to={mode.to} state={explicitGameLaunchState()}>
              {link}
            </RouterLink>
          ) : (
            <RouterLink to={mode.to}>{link}</RouterLink>
          )}
        </Button>
      )
    })}
  </SimpleGrid>
)

export const HomePage = () => (
  <ContentContainer>
    <Box py={{ base: 6, md: 10 }} pb={10}>
      <Stack gap={8}>
        <Stack gap={3} maxW="720px">
          <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
            Open source darts scoring
          </Heading>
          <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
            The easiest way to get started. Pick a game mode and play right away. No account, no
            setup. Open Darts tracks every dart you throw so you can analyze your progress over
            time.
          </Text>
          <Text color="whiteAlpha.700" fontSize="md" lineHeight="1.65">
            Play x01 matches solo, with a guest, or against a bot. Practice modes stay focused on
            solo training for now.
          </Text>
        </Stack>

        <ResumeGameBanner />

        <Stack gap={4}>
          <Stack gap={1}>
            <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
              Match
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
              x01 legs with optional guest or bot opponents.
            </Text>
          </Stack>
          <ModeGrid modes={MATCH_MODES} />
        </Stack>

        <Stack gap={4}>
          <Stack gap={1}>
            <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
              Practice
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
              Solo training modes to sharpen specific parts of your game.
            </Text>
          </Stack>
          <ModeGrid modes={PRACTICE_MODES} explicitLaunch />
        </Stack>
      </Stack>
    </Box>
  </ContentContainer>
)
