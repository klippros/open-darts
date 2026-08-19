import { Box, HStack, Text } from '@chakra-ui/react'
import { formatChallengeLegProgressLabel } from '../../lib/game/challenge'
import { ChallengeLegStatus } from '../../types/match'

export interface ChallengeLegDotsProps {
  legStatuses: ChallengeLegStatus[]
}

const CHALLENGE_LEG_DOTS_MAX = 9

const getDotStyles = (status: ChallengeLegStatus) => {
  switch (status) {
    case ChallengeLegStatus.Won:
      return {
        bg: 'orange.300',
        border: '2px solid',
        borderColor: 'orange.300',
      }
    case ChallengeLegStatus.Lost:
      return {
        bg: 'transparent',
        border: '2px solid',
        borderColor: 'whiteAlpha.300',
      }
    case ChallengeLegStatus.Current:
      return {
        bg: 'transparent',
        border: '2px solid',
        borderColor: 'orange.300',
      }
    case ChallengeLegStatus.Upcoming:
      return {
        bg: 'transparent',
        border: '2px solid',
        borderColor: 'whiteAlpha.200',
      }
  }
}

export const ChallengeLegDots = ({ legStatuses }: ChallengeLegDotsProps) => {
  const progressLabel = formatChallengeLegProgressLabel(legStatuses)

  if (legStatuses.length > CHALLENGE_LEG_DOTS_MAX) {
    const wins = legStatuses.filter((status) => status === ChallengeLegStatus.Won).length
    const losses = legStatuses.filter((status) => status === ChallengeLegStatus.Lost).length

    return (
      <Text fontSize="sm" color="whiteAlpha.600" aria-label={progressLabel}>
        {wins}–{losses}
      </Text>
    )
  }

  return (
    <HStack gap={1.5} aria-label={progressLabel}>
      {legStatuses.map((status, index) => (
        <Box
          key={index}
          w="8px"
          h="8px"
          borderRadius="full"
          flexShrink={0}
          {...getDotStyles(status)}
        />
      ))}
    </HStack>
  )
}
