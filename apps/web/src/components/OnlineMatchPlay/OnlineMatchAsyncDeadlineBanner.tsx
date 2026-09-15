import { Box, Text } from '@chakra-ui/react'

export interface OnlineMatchAsyncDeadlineBannerProps {
  secondsLeft: number
}

const formatAsyncDeadline = (secondsLeft: number): string => {
  const totalSeconds = Math.max(0, secondsLeft)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`
  }

  if (minutes > 0) {
    return `${String(minutes)}m`
  }

  return `${String(totalSeconds)}s`
}

export const OnlineMatchAsyncDeadlineBanner = ({
  secondsLeft,
}: OnlineMatchAsyncDeadlineBannerProps) => (
  <Box
    borderWidth="1px"
    borderColor="blue.300"
    borderRadius="lg"
    bg="rgba(99, 179, 237, 0.14)"
    px={4}
    py={3}
  >
    <Text color="white" fontSize="sm">
      Asynchronous play · {formatAsyncDeadline(secondsLeft)} left for both players to finish.
    </Text>
  </Box>
)
