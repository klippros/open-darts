import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { buildMatchPath } from '../../lib/matchServer/api'
import type { InProgressOnlineMatchRow } from '../../lib/matchServer/types'
import { MatchStatus } from '../../lib/matchServer/types'

export interface ResumeOnlineMatchBannerProps {
  match: InProgressOnlineMatchRow
}

export const ResumeOnlineMatchBanner = ({ match }: ResumeOnlineMatchBannerProps) => {
  const label = match.status === MatchStatus.Waiting ? 'waiting room' : 'online match'

  return (
    <Box
      borderWidth="1px"
      borderColor="orange.300"
      borderRadius="lg"
      bg="rgba(246, 173, 85, 0.14)"
      px={5}
      py={4}
    >
      <Stack gap={3} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }}>
        <Stack gap={1} flex="1">
          <HStack gap={2} align="center">
            <Box
              className="online-pulse-dot"
              w="8px"
              h="8px"
              borderRadius="full"
              bg="yellow.400"
              flexShrink={0}
              aria-hidden
            />
            <Text fontWeight="semibold" color="white">
              Continue your {label}
            </Text>
          </HStack>
          <Text fontSize="sm" color="whiteAlpha.700">
            You already have an in-progress online match. Finish or leave it before starting
            another.
          </Text>
        </Stack>
        <Button asChild variant="cta" flexShrink={0}>
          <RouterLink to={buildMatchPath(match.id)}>Continue</RouterLink>
        </Button>
      </Stack>
    </Box>
  )
}
