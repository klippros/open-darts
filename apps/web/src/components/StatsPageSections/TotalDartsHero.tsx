import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { countTotalDartsThrown } from '../../lib/analytics/visitStats'
import type { GameSession } from '../../types/gameSession'
import { formatInteger } from '../../lib/analytics/formatAnalytics'

export interface TotalDartsHeroProps {
  sessions: GameSession[]
}

export const TotalDartsHero = ({ sessions }: TotalDartsHeroProps) => {
  const totalDarts = countTotalDartsThrown(sessions)

  if (sessions.length === 0) {
    return null
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={5}
      py={5}
      textAlign="center"
    >
      <Stack gap={1}>
        <Heading size="4xl" color="white" fontFamily="Archivo Black, sans-serif" lineHeight="1">
          {formatInteger(totalDarts)}
        </Heading>
        <Text fontSize="sm" color="whiteAlpha.700">
          Darts thrown
        </Text>
      </Stack>
    </Box>
  )
}
