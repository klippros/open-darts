import { Box, Button, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useAuth } from '../../hooks/authContext'
import { isOnlineMatchesEnabled } from '../../lib/matchServer/config'
import type { InProgressOnlineMatchRow } from '../../lib/matchServer/types'
import { AuthStatus } from '../../types/auth'
import { ResumeOnlineMatchBanner } from '../ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'
import { SignInDialog } from '../SignInDialog/SignInDialog'
import { HomePageModeGrid } from './HomePageModeGrid'
import { ONLINE_MODES } from './homePageModes'

export interface HomePageOnlineSectionProps {
  resumeMatch: InProgressOnlineMatchRow | null
}

export const HomePageOnlineSection = ({ resumeMatch }: HomePageOnlineSectionProps) => {
  const { authStatus } = useAuth()
  const [signInOpen, setSignInOpen] = useState(false)

  if (!isOnlineMatchesEnabled) {
    return null
  }

  const isSignedIn = authStatus === AuthStatus.Authenticated
  const authReady = authStatus !== AuthStatus.Loading

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
          Online
        </Heading>
        <Text color="whiteAlpha.700" fontSize="sm" lineHeight="1.55">
          {authReady && !isSignedIn
            ? 'Two-player matches over the internet. Sign in to create or join a match.'
            : 'Two-player matches over the internet. Invite a signed-in opponent.'}
        </Text>
      </Stack>
      {authReady && isSignedIn && resumeMatch !== null ? (
        <ResumeOnlineMatchBanner match={resumeMatch} />
      ) : authReady && isSignedIn ? (
        <HomePageModeGrid modes={ONLINE_MODES} showLiveIndicator />
      ) : authReady ? (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          <Button
            variant="cta"
            h="auto"
            py={5}
            px={5}
            flexDirection="column"
            alignItems="flex-start"
            gap={1}
            textAlign="left"
            onClick={() => {
              setSignInOpen(true)
            }}
          >
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
                Sign in to play online
              </Text>
            </HStack>
            <Text fontSize="sm" color="whiteAlpha.700" fontWeight="normal">
              Create a match and share an invite
            </Text>
          </Button>
        </SimpleGrid>
      ) : null}
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        returnTo="/"
        title="Sign in to play online"
        description="Online matches need a signed-in account. After you sign in, you can create a match and invite an opponent."
      />
    </Stack>
  )
}
