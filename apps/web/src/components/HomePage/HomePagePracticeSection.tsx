import { Heading, Stack, Text } from '@chakra-ui/react'
import { HomePageModeGrid } from './HomePageModeGrid'
import { PRACTICE_MODES } from './homePageModes'

export const HomePagePracticeSection = () => (
  <Stack gap={4}>
    <Stack gap={1}>
      <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
        Practice
      </Heading>
      <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
        Solo training modes to sharpen specific parts of your game.
      </Text>
    </Stack>
    <HomePageModeGrid modes={PRACTICE_MODES} explicitLaunch />
  </Stack>
)
