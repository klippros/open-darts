import { HStack, Box } from '@chakra-ui/react'

export interface LegWinDotsProps {
  legsToWin: number
  legsWon: number
  isSolo?: boolean
}

export const LegWinDots = ({ legsToWin, legsWon, isSolo = false }: LegWinDotsProps) => {
  const dotSize = legsToWin > 9 ? '6px' : '8px'
  const progressLabel = isSolo
    ? `${legsWon} of ${legsToWin} legs completed`
    : `${legsWon} of ${legsToWin} legs won`

  return (
    <HStack gap={1.5} aria-label={progressLabel}>
      {Array.from({ length: legsToWin }, (_, index) => (
        <Box
          key={index}
          w={dotSize}
          h={dotSize}
          borderRadius="full"
          bg={index < legsWon ? 'orange.300' : 'whiteAlpha.300'}
          flexShrink={0}
        />
      ))}
    </HStack>
  )
}
