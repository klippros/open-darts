import { Box, Button, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { gameModeDefinitions } from '../../lib/game/gameModeDefinitions'
import { buildGamePathFromSession } from '../../lib/storage/sessionMatching'
import { getResumableSnapshot } from '../../lib/storage/visitPersistence'

export const ResumeGameBanner = () => {
  const snapshot = getResumableSnapshot()

  if (snapshot === null) {
    return null
  }

  const { session } = snapshot
  const modeLabel = gameModeDefinitions[session.mode].label
  const resumePath = buildGamePathFromSession(session)
  const visitCount = session.visits.length

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      px={5}
      py={4}
    >
      <Stack gap={3} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }}>
        <Stack gap={1} flex="1">
          <Text fontWeight="semibold" color="white">
            Continue your {modeLabel} game
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700">
            {visitCount === 0
              ? 'Pick up where you left off.'
              : `${visitCount} visit${visitCount === 1 ? '' : 's'} saved locally.`}
          </Text>
        </Stack>
        <Button asChild variant="cta" flexShrink={0}>
          <RouterLink to={resumePath}>Resume game</RouterLink>
        </Button>
      </Stack>
    </Box>
  )
}
