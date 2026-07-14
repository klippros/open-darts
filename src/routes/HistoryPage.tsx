import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { BetaBanner } from '../components/BetaBanner/BetaBanner'
import { ContentContainer } from '../components/ContentContainer'
import { CreateAccountForm } from '../components/CreateAccountForm/CreateAccountForm'
import { HistoryList } from '../components/HistoryList/HistoryList'
import { ResetStatsDialog } from '../components/ResetStatsDialog/ResetStatsDialog'
import { useAccount } from '../hooks/accountContext'
import { sortSessionsByDate } from '../lib/history/sessionSummary'
import { clearStoredSessions, loadStoredSessions } from '../lib/storage/gameStore'

export const HistoryPage = () => {
  const { account, createAccount, signOut } = useAccount()
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [sessions, setSessions] = useState(() => sortSessionsByDate(loadStoredSessions()))

  const handleCreateAccount = (input: Parameters<typeof createAccount>[0]) => {
    const error = createAccount(input)

    if (error === null) {
      setShowAccountForm(false)
    }

    return error
  }

  const handleResetConfirm = useCallback(() => {
    clearStoredSessions()
    setSessions([])
    setResetDialogOpen(false)
  }, [])

  const hasSavedGames = sessions.length > 0

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="720px" w="full" mx="auto">
        <Stack gap={8}>
          <BetaBanner title="History is in beta">
            Saved games, profiles, and sync are still early. Things may change, and data lives on
            this device for now.
          </BetaBanner>

          <Stack gap={3}>
            <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
              History
            </Heading>
            <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
              Completed games saved on this device. Create a local profile to keep your history
              organized across sessions.
            </Text>
          </Stack>

          {account === null ? (
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="whiteAlpha.50"
              px={5}
              py={5}
            >
              {showAccountForm ? (
                <Stack gap={4}>
                  <Text fontWeight="semibold" color="white">
                    Create a local profile
                  </Text>
                  <CreateAccountForm
                    onSubmit={handleCreateAccount}
                    onCancel={() => {
                      setShowAccountForm(false)
                    }}
                  />
                </Stack>
              ) : (
                <Stack gap={3} direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }}>
                  <Stack gap={1} flex="1">
                    <Text fontWeight="semibold" color="white">
                      No profile yet
                    </Text>
                    <Text fontSize="sm" color="whiteAlpha.700">
                      Your completed games are still stored locally on this device.
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
                      variant="cta"
                      flexShrink={0}
                      onClick={() => {
                        setShowAccountForm(true)
                      }}
                    >
                      Create profile
                    </Button>
                  </Stack>
                </Stack>
              )}
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
                    {account.displayName}
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.700">
                    {account.email ?? 'Local profile on this device'}
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
                  <Button variant="cancel" flexShrink={0} onClick={signOut}>
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
        onConfirm={handleResetConfirm}
      />
    </ContentContainer>
  )
}
