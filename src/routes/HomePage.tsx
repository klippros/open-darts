import { Box, Button, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'

const GAME_MODES = [
  { id: '501', label: '501', description: 'Classic double-out', start: 501, available: true },
  { id: '401', label: '401', description: 'Shorter x01 leg', start: 401, available: false },
  { id: '301', label: '301', description: 'Quick x01 leg', start: 301, available: false },
  { id: 'bob', label: "Bob's 27", description: 'Doubles practice', start: null, available: false },
  { id: '121', label: '121', description: 'Checkout practice', start: null, available: false },
  {
    id: 'around-the-clock',
    label: 'Around the Clock',
    description: 'Hit 1 to 20 and bull',
    start: null,
    available: false,
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

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          {GAME_MODES.map((mode) =>
            mode.available ? (
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
                <RouterLink to={`/game?start=${mode.start}`}>
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
