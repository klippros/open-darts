import { Box, Button, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../hooks/authContext'
import { isOnlineMatchesEnabled } from '../../lib/matchServer/config'
import type { InProgressOnlineMatchRow } from '../../lib/matchServer/types'
import { AuthStatus } from '../../types/auth'
import { ResumeOnlineMatchBanner } from '../ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'

export interface HomePageOnlineSectionProps {
  resumeMatch: InProgressOnlineMatchRow | null
}

export const HomePageOnlineSection = ({ resumeMatch }: HomePageOnlineSectionProps) => {
  const { authStatus } = useAuth()

  if (!isOnlineMatchesEnabled || authStatus !== AuthStatus.Authenticated) {
    return null
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
          Online
        </Heading>
        <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
          Two-player 501 over the internet. Invite a signed-in opponent.
        </Text>
      </Stack>
      {resumeMatch !== null ? (
        <ResumeOnlineMatchBanner match={resumeMatch} />
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          <Button
            asChild
            variant="cta"
            h="auto"
            py={5}
            px={5}
            flexDirection="column"
            alignItems="flex-start"
            gap={1}
            textAlign="left"
          >
            <RouterLink to="/match/new">
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
                <Text fontSize="lg" fontWeight="semibold" color="white">
                  Online 501
                </Text>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal">
                Create a match and share an invite
              </Text>
            </RouterLink>
          </Button>
        </SimpleGrid>
      )}
    </Stack>
  )
}
