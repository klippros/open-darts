import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { ContentContainer } from '../components/ContentContainer'
import { HistoryList } from '../components/HistoryList/HistoryList'
import { ResetStatsDialog } from '../components/ResetStatsDialog/ResetStatsDialog'
import { SignInDialog } from '../components/SignInDialog/SignInDialog'
import { useAuth } from '../hooks/authContext'
import { getSyncStatusLabel } from '../lib/auth/syncStatusLabel'
import { sortSessionsByDate } from '../lib/history/sessionSummary'
import { clearStoredSessions, loadStoredSessions } from '../lib/storage/gameStore'
import { AuthStatus, SyncStatus } from '../types/auth'

export const HistoryPage = () => {
  const { user, profile, authStatus, syncStatus, isConfigured, signOut, clearSyncedSessions } =
    useAuth()
  const [signInDialogOpen, setSignInDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [sessions, setSessions] = useState(() => sortSessionsByDate(loadStoredSessions()))

  useEffect(() => {
    if (authStatus === AuthStatus.Anonymous || authStatus === AuthStatus.Authenticated) {
      setSessions(sortSessionsByDate(loadStoredSessions()))
    }
  }, [authStatus])

  useEffect(() => {
    if (syncStatus === SyncStatus.Synced) {
      setSessions(sortSessionsByDate(loadStoredSessions()))
    }
  }, [syncStatus])

  const handleResetConfirm = useCallback(async () => {
    const clearError = await clearSyncedSessions()

    if (clearError !== null) {
      return
    }

    clearStoredSessions()
    setSessions([])
    setResetDialogOpen(false)
  }, [clearSyncedSessions])

  const hasSavedGames = sessions.length > 0
  const isSignedIn = authStatus === AuthStatus.Authenticated && user !== null
  const syncLabel = getSyncStatusLabel(syncStatus)

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="720px" w="full" mx="auto">
        <Stack gap={8}>
          <Stack gap={3}>
            <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
              History
            </Heading>
            <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
              Completed games are saved locally. Sign in optionally to back them up and use your
              History and Stats across devices.
            </Text>
          </Stack>

          {!isSignedIn ? (
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="whiteAlpha.50"
              px={5}
              py={5}
            >
              <Stack gap={3} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }}>
                <Stack gap={1} flex="1">
                  <Text fontWeight="semibold" color="white">
                    Playing anonymously
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.700">
                    Your completed games are stored locally in the browser.
                  </Text>
                </Stack>
                <Stack direction={{ base: 'column', sm: 'row' }} gap={2} flexShrink={0}>
                  {hasSavedGames && (
                    <Button
                      variant="destructive"
                      flexShrink={0}
                      onClick={() => {
                        setResetDialogOpen(true)
                      }}
                    >
                      Reset history and stats
                    </Button>
                  )}
                  {isConfigured && (
                    <Button
                      variant="cta"
                      flexShrink={0}
                      onClick={() => {
                        setSignInDialogOpen(true)
                      }}
                    >
                      Sign in to sync
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          ) : (
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
                    {profile?.displayName ?? user.email ?? 'Signed in'}
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.700">
                    {syncLabel}
                  </Text>
                </Stack>
                <Stack direction={{ base: 'column', sm: 'row' }} gap={2} flexShrink={0}>
                  {hasSavedGames && (
                    <Button
                      variant="destructive"
                      flexShrink={0}
                      onClick={() => {
                        setResetDialogOpen(true)
                      }}
                    >
                      Reset history and stats
                    </Button>
                  )}
                  <Button
                    variant="cancel"
                    flexShrink={0}
                    onClick={() => {
                      void signOut()
                    }}
                  >
                    Sign out
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}

          <HistoryList sessions={sessions} />
        </Stack>
      </Box>
      <ResetStatsDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onConfirm={() => {
          void handleResetConfirm()
        }}
        isSignedIn={isSignedIn}
      />
      <SignInDialog open={signInDialogOpen} onOpenChange={setSignInDialogOpen} />
    </ContentContainer>
  )
}
