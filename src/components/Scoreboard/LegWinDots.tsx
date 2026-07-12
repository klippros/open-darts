import { HStack, Box, Text } from '@chakra-ui/react'

export interface LegWinDotsProps {
  legsToWin: number
  legsWon: number
  isSolo?: boolean
}

const LEG_WIN_DOTS_MAX = 5

export const LegWinDots = ({ legsToWin, legsWon, isSolo = false }: LegWinDotsProps) => {
  const progressLabel = isSolo
    ? `${legsWon} of ${legsToWin} legs completed`
    : `${legsWon} of ${legsToWin} legs won`

  if (legsToWin > LEG_WIN_DOTS_MAX) {
    return (
      <Text fontSize="sm" color="whiteAlpha.600" aria-label={progressLabel}>
        {legsWon}/{legsToWin}
      </Text>
    )
  }

  return (
    <HStack gap={1.5} aria-label={progressLabel}>
      {Array.from({ length: legsToWin }, (_, index) => (
        <Box
          key={index}
          w="8px"
          h="8px"
          borderRadius="full"
          bg={index < legsWon ? 'orange.300' : 'whiteAlpha.300'}
          flexShrink={0}
        />
      ))}
    </HStack>
  )
}
