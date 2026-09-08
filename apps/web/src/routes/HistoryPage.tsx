import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContentContainer } from '../components/ContentContainer'
import { HistoryList } from '../components/HistoryList/HistoryList'
import type { HistoryListEntry } from '../components/HistoryList/HistoryList'
import { SessionSummaryDialog } from '../components/MatchSummaryDialog/SessionSummaryDialog'
import { ResetStatsDialog } from '../components/ResetStatsDialog/ResetStatsDialog'
import { SignInDialog } from '../components/SignInDialog/SignInDialog'
import { useAuth } from '../hooks/authContext'
import { getSyncStatusLabel } from '../lib/auth/syncStatusLabel'
import {
  getOnlineMatchCompletedAt,
  getOnlineMatchResultSummary,
  HistoryEntrySource,
} from '../lib/history/onlineHistorySummary'
import { sortSessionsByDate } from '../lib/history/sessionSummary'
import { listMyOnlineMatchHistory } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import type { OnlineMatchHistoryRow } from '../lib/matchServer/types'
import { clearStoredSessions, loadStoredSessions } from '../lib/storage/gameStore'
import { supabaseClient } from '../lib/supabase/client'
import { AuthStatus, SyncStatus } from '../types/auth'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'

export const HistoryPage = () => {
  const { user, profile, authStatus, syncStatus, isConfigured, signOut, clearSyncedSessions } =
    useAuth()
  const [signInDialogOpen, setSignInDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null)
  const [sessions, setSessions] = useState(() => sortSessionsByDate(loadStoredSessions()))
  const [onlineMatches, setOnlineMatches] = useState<OnlineMatchHistoryRow[]>([])
  const [opponentNames, setOpponentNames] = useState<Record<string, string>>({})

  const isSignedIn = authStatus === AuthStatus.Authenticated && user !== null
  const shouldLoadOnlineHistory = isSignedIn && isOnlineMatchesEnabled

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

  useEffect(() => {
    if (!shouldLoadOnlineHistory || user === null) {
      setOnlineMatches([])
      setOpponentNames({})
      return undefined
    }

    let cancelled = false
    const viewerUserId = user.id

    const loadOnlineHistory = async () => {
      try {
        const matches = await listMyOnlineMatchHistory(viewerUserId)
        if (cancelled) {
          return
        }

        setOnlineMatches(matches)

        const opponentIds = [
          ...new Set(
            matches
              .map((match) => match.opponentUserId)
              .filter((id): id is string => typeof id === 'string'),
          ),
        ]

        if (opponentIds.length === 0 || supabaseClient === null) {
          setOpponentNames({})
          return
        }

        const { data } = await supabaseClient
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', opponentIds)

        if (cancelled) {
          return
        }

        const next: Record<string, string> = {}
        for (const row of data ?? []) {
          if (typeof row === 'object' && row !== null && typeof row.user_id === 'string') {
            const displayName =
              'display_name' in row && typeof row.display_name === 'string'
                ? row.display_name
                : null
            next[row.user_id] = resolveHumanPlayerName(displayName)
          }
        }
        setOpponentNames(next)
      } catch {
        if (!cancelled) {
          setOnlineMatches([])
          setOpponentNames({})
        }
      }
    }

    void loadOnlineHistory()

    return () => {
      cancelled = true
    }
  }, [shouldLoadOnlineHistory, user])

  const handleResetConfirm = useCallback(async () => {
    const clearError = await clearSyncedSessions()

    if (clearError !== null) {
      return
    }

    clearStoredSessions()
    setSessions([])
    setResetDialogOpen(false)
  }, [clearSyncedSessions])

  const entries = useMemo((): HistoryListEntry[] => {
    const localEntries: HistoryListEntry[] = sessions.map((session) => ({
      source: HistoryEntrySource.Local,
      id: session.id,
      sortAt: session.completedAt ?? session.startedAt,
      session,
    }))

    if (user === null) {
      return localEntries
    }

    const viewerUserId = user.id
    const onlineEntries: HistoryListEntry[] = onlineMatches.map((match) => {
      const opponentName =
        match.opponentUserId === null
          ? 'Opponent'
          : (opponentNames[match.opponentUserId] ?? 'Opponent')

      return {
        source: HistoryEntrySource.Online,
        id: match.id,
        sortAt: getOnlineMatchCompletedAt(match),
        match,
        resultSummary: getOnlineMatchResultSummary(match, viewerUserId, opponentName),
      }
    })

    return [...localEntries, ...onlineEntries].sort((left, right) =>
      right.sortAt.localeCompare(left.sortAt),
    )
  }, [onlineMatches, opponentNames, sessions, user])

  const hasSavedGames = sessions.length > 0
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
              {isOnlineMatchesEnabled
                ? ' Online matches appear here for both players under the same match id.'
                : ''}
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

          <HistoryList entries={entries} onSelectSession={setSelectedSession} />
        </Stack>
      </Box>
      <SessionSummaryDialog
        open={selectedSession !== null}
        session={selectedSession}
        onClose={() => {
          setSelectedSession(null)
        }}
      />
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
