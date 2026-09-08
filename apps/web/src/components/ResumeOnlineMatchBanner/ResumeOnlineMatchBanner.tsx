import { Box, Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { buildMatchPath, getMyInProgressOnlineMatch } from '../../lib/matchServer/api'
import type { InProgressOnlineMatchRow } from '../../lib/matchServer/types'

export const ResumeOnlineMatchBanner = () => {
  const [match, setMatch] = useState<InProgressOnlineMatchRow | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const inProgress = await getMyInProgressOnlineMatch()
        if (!cancelled) {
          setMatch(inProgress)
        }
      } catch {
        if (!cancelled) {
          setMatch(null)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  if (match === null) {
    return null
  }

  const label = match.status === 'waiting' ? 'waiting room' : 'online match'

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
          <Text fontWeight="semibold" color="white">
            Continue your {label}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700">
            You already have an in-progress online match.
          </Text>
        </Stack>
        <Button asChild variant="cta" flexShrink={0}>
          <RouterLink to={buildMatchPath(match.id)}>Continue</RouterLink>
        </Button>
      </Stack>
    </Box>
  )
}
