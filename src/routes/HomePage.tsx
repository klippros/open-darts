import { Box, Button, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { ResumeGameBanner } from '../components/ResumeGameBanner/ResumeGameBanner'
import { buildPracticeGamePath } from '../lib/game/gameRoute'
import { GameModeId } from '../types/gameMode'
import { buildX01PresetPath, X01PresetId } from '../lib/x01/x01Presets'

const GAME_MODES = [
  {
    id: X01PresetId.FiveOhOne,
    label: '501',
    description: 'Classic double-out',
    to: buildX01PresetPath(X01PresetId.FiveOhOne),
    available: true,
  },
  {
    id: X01PresetId.FourOhOne,
    label: '401',
    description: 'Shorter x01 leg',
    to: buildX01PresetPath(X01PresetId.FourOhOne),
    available: true,
  },
  {
    id: X01PresetId.ThreeOhOne,
    label: '301',
    description: 'Quick x01 leg',
    to: buildX01PresetPath(X01PresetId.ThreeOhOne),
    available: true,
  },
  {
    id: 'custom-x01',
    label: 'Custom x01',
    description: 'Choose start score and rules',
    to: '/game/setup',
    available: true,
  },
  {
    id: 'bob',
    label: "Bob's 27",
    description: 'Doubles practice',
    to: buildPracticeGamePath(GameModeId.Bob27),
    available: true,
  },
  {
    id: '121',
    label: '121',
    description: 'Checkout practice',
    to: buildPracticeGamePath(GameModeId.OneTwentyOne),
    available: true,
  },
  {
    id: 'around-the-clock',
    label: 'Around the Clock',
    description: 'Hit 1 to 20 and bull',
    to: buildPracticeGamePath(GameModeId.AroundTheClock),
    available: true,
  },
  {
    id: '10-up-1-down',
    label: '10 Up 1 Down',
    description: 'Checkout up or down',
    to: buildPracticeGamePath(GameModeId.TenUpOneDown),
    available: true,
  },
] as const

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
            From classic 501 to fun practice games like Bob&apos;s 27 and Around the Clock. Play
            solo today, with more modes and opponents coming soon.
          </Text>
        </Stack>

        <ResumeGameBanner />

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          {GAME_MODES.map((mode) =>
            mode.available && mode.to !== null ? (
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
                <RouterLink to={mode.to}>
                  <Text fontSize="lg" fontWeight="semibold" color="white">
                    {mode.label}
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal">
                    {mode.description}
                  </Text>
                </RouterLink>
              </Button>
            ) : (
              <Button
                key={mode.id}
                variant="cta"
                h="auto"
                py={5}
                px={5}
                flexDirection="column"
                alignItems="flex-start"
                gap={1}
                textAlign="left"
                disabled
                opacity={0.7}
                cursor="not-allowed"
              >
                <Text fontSize="lg" fontWeight="semibold" color="white">
                  {mode.label}
                </Text>
                <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal">
                  {mode.description}
                </Text>
              </Button>
            ),
          )}
        </SimpleGrid>
      </Stack>
    </Box>
  </ContentContainer>
)
