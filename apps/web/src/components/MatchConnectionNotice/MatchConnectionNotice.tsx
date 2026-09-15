import { Box, Stack, Text } from '@chakra-ui/react'

export interface MatchConnectionNoticeProps {
  error: string | null
  showReconnecting: boolean
}

/** Fixed overlay so connection status never shifts the match layout. */
export const MatchConnectionNotice = ({ error, showReconnecting }: MatchConnectionNoticeProps) => {
  if (error === null && !showReconnecting) {
    return null
  }

  return (
    <Box
      position="fixed"
      top={4}
      left="50%"
      transform="translateX(-50%)"
      zIndex="toast"
      maxW="calc(100vw - 2rem)"
      px={4}
      py={2}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={error !== null ? 'red.400' : 'whiteAlpha.300'}
      bg={error !== null ? 'rgba(254, 178, 178, 0.16)' : 'rgba(0, 0, 0, 0.72)'}
      backdropFilter="blur(8px)"
      pointerEvents="none"
    >
      <Stack gap={1}>
        {error !== null && (
          <Text color="red.200" fontSize="sm" textAlign="center">
            {error}
          </Text>
        )}
        {showReconnecting && (
          <Text color="whiteAlpha.800" fontSize="sm" textAlign="center">
            Reconnecting…
          </Text>
        )}
      </Stack>
    </Box>
  )
}
