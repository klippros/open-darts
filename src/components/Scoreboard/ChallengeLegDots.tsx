import { Box, HStack, Text } from '@chakra-ui/react'
import { formatChallengeLegProgressLabel } from '../../lib/game/challenge'
import { ChallengeLegStatus } from '../../types/match'

export interface ChallengeLegDotsProps {
  legStatuses: ChallengeLegStatus[]
}

const CHALLENGE_LEG_DOTS_MAX = 9

const DOT_STYLES: Record<ChallengeLegStatus, { bg: string; border: string; borderColor: string }> =
  {
    [ChallengeLegStatus.Won]: {
      bg: 'orange.300',
      border: '2px solid',
      borderColor: 'orange.300',
    },
    [ChallengeLegStatus.Lost]: {
      bg: 'transparent',
      border: '2px solid',
      borderColor: 'whiteAlpha.300',
    },
    [ChallengeLegStatus.Current]: {
      bg: 'transparent',
      border: '2px solid',
      borderColor: 'orange.300',
    },
    [ChallengeLegStatus.Upcoming]: {
      bg: 'transparent',
      border: '2px solid',
      borderColor: 'whiteAlpha.200',
    },
  }

const getDotStyles = (status: ChallengeLegStatus) => DOT_STYLES[status]

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
          key={`challenge-leg-${status}-${String(index)}`}
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
