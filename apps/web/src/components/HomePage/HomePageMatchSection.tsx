import { Heading, Stack, Text } from '@chakra-ui/react'
import { HomePageModeGrid } from './HomePageModeGrid'
import { MATCH_MODES } from './homePageModes'

export const HomePageMatchSection = () => (
  <Stack gap={4}>
    <Stack gap={1}>
      <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
        Match
      </Heading>
      <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
        x01 legs with optional guest opponents or visit-limit challenge mode.
      </Text>
    </Stack>
    <HomePageModeGrid modes={MATCH_MODES} />
  </Stack>
)
