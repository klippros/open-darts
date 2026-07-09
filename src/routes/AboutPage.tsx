import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { ContentContainer } from '../components/ContentContainer'

export const AboutPage = () => (
  <ContentContainer>
    <Box py={{ base: 6, md: 10 }} pb={10}>
      <Stack gap={8} maxW="720px" w="full" mx="auto">
        <Stack gap={3}>
          <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
            About Open Darts
          </Heading>
          <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
            Open Darts is an open source darts scoring app built to get you playing as fast as
            possible. Jump into 501, 301, Bob&apos;s 27, 121, Around the Clock, and more. Whether
            you are practicing alone or playing with friends, there is a mode for it.
          </Text>
          <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
            Every dart you throw is recorded. That gives you the data to see how you are improving:
            averages, checkout rates, trends across games, and how each practice session adds up
            over time.
          </Text>
          <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
            You can start playing without an account. When your first game is over, you can decide
            to create an account and save your progress.
          </Text>
        </Stack>

        <Stack gap={3}>
          <Heading as="h2" size="xl" color="white" fontFamily="Archivo Black, sans-serif">
            Privacy
          </Heading>
          <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.65">
            All game data stays on your device until you choose to save it. No account required to
            play. In the first version there is no backend. Everything runs in your browser.
          </Text>
        </Stack>
      </Stack>
    </Box>
  </ContentContainer>
)
