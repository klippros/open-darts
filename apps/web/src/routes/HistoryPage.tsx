import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ContentContainer } from '../components/ContentContainer'
import { HistoryList } from '../components/HistoryList/HistoryList'
import type { HistoryListEntry } from '../components/HistoryList/HistoryList'
import { OnlineMatchSummaryDialog } from '../components/MatchSummaryDialog/OnlineMatchSummaryDialog'
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
import {
  HISTORY_PAGE_SIZE,
  loadedHistoryCoversPage,
  takeMergedHistoryPage,
} from '../lib/history/historyPager'
import { sortSessionsByDate } from '../lib/history/sessionSummary'
import { getMyOnlineMatchDetail, listMyOnlineMatchSummaries } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { decorateOnlineSessionForViewer } from '../lib/matchServer/onlinePlay'
import type { OnlineMatchHistoryRow, OnlineMatchSummary } from '../lib/matchServer/types'
import { clearStoredSessions, loadStoredSessions } from '../lib/storage/gameStore'
import { AuthStatus, SyncStatus } from '../types/auth'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { resolveHumanPlayerName } from '@open-darts/game/game/playerFactory'

export const HistoryPage = () => {
  const { user, profile, authStatus, syncStatus, isConfigured, signOut, clearSyncedSessions } =
    useAuth()
  const [signInDialogOpen, setSignInDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null)
  const [selectedOnlineMatch, setSelectedOnlineMatch] = useState<{
    match: OnlineMatchHistoryRow
    resultSummary: string
  } | null>(null)
  const [sessions, setSessions] = useState(() => sortSessionsByDate(loadStoredSessions()))
  const [onlineMatches, setOnlineMatches] = useState<OnlineMatchSummary[]>([])
  const [onlineHasMore, setOnlineHasMore] = useState(false)
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

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
      setOnlineHasMore(false)
      return undefined
    }

    let cancelled = false
    const viewerUserId = user.id

    const loadOnlineHistory = async () => {
      try {
        const matches = await listMyOnlineMatchSummaries(viewerUserId, {
          limit: HISTORY_PAGE_SIZE,
        })
        if (cancelled) {
          return
        }

        setOnlineMatches(matches)
        setOnlineHasMore(matches.length === HISTORY_PAGE_SIZE)
        setVisibleCount(HISTORY_PAGE_SIZE)
      } catch {
        if (!cancelled) {
          setOnlineMatches([])
          setOnlineHasMore(false)
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

  const handleSelectOnlineMatch = useCallback(
    async (match: OnlineMatchSummary, resultSummary: string) => {
      if (user === null) {
        return
      }

      try {
        const detail = await getMyOnlineMatchDetail(user.id, match.id)
        if (detail?.session !== null && detail?.session !== undefined) {
          const opponentName = resolveHumanPlayerName(
            detail.opponentDisplayName ?? match.opponentDisplayName,
          )
          setSelectedOnlineMatch(null)
          setSelectedSession(
            decorateOnlineSessionForViewer(
              detail.session,
              user.id,
              profile?.displayName,
              opponentName,
            ),
          )
          return
        }

        setSelectedSession(null)
        setSelectedOnlineMatch({
          match: detail ?? { ...match, scorecardVersion: 1, session: null },
          resultSummary,
        })
      } catch {
        setSelectedSession(null)
        setSelectedOnlineMatch({
          match: { ...match, scorecardVersion: 1, session: null },
          resultSummary,
        })
      }
    },
    [profile?.displayName, user],
  )

  const handleSelectSession = useCallback((session: GameSession) => {
    setSelectedOnlineMatch(null)
    setSelectedSession(session)
  }, [])

  const localEntries = useMemo(
    (): HistoryListEntry[] =>
      sessions.map((session) => ({
        source: HistoryEntrySource.Local,
        id: session.id,
        sortAt: session.completedAt ?? session.startedAt,
        session,
      })),
    [sessions],
  )

  const onlineEntries = useMemo((): HistoryListEntry[] => {
    if (user === null) {
      return []
    }

    const viewerUserId = user.id

    return onlineMatches.map((match) => {
      const opponentName = resolveHumanPlayerName(match.opponentDisplayName)

      return {
        source: HistoryEntrySource.Online as const,
        id: match.id,
        sortAt: getOnlineMatchCompletedAt(match),
        match,
        resultSummary: getOnlineMatchResultSummary(match, viewerUserId, opponentName),
        canOpenDetail: true,
      }
    })
  }, [onlineMatches, user])

  const page = useMemo(
    () => takeMergedHistoryPage(localEntries, onlineEntries, visibleCount),
    [localEntries, onlineEntries, visibleCount],
  )

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) {
      return
    }

    const nextVisible = visibleCount + HISTORY_PAGE_SIZE
    setVisibleCount(nextVisible)

    if (!shouldLoadOnlineHistory || user === null || !onlineHasMore) {
      return
    }

    const lastOnline = onlineMatches.at(-1)
    if (lastOnline === undefined) {
      return
    }

    // Unknown online rows sort after the last fetched online row. Avoid a
    // request when loaded local rows already fill the next page above it.
    if (
      loadedHistoryCoversPage(localEntries, onlineEntries, nextVisible, {
        id: lastOnline.id,
        sortAt: getOnlineMatchCompletedAt(lastOnline),
      })
    ) {
      return
    }

    setLoadingMore(true)
    try {
      const more = await listMyOnlineMatchSummaries(user.id, {
        beforeCompletedAt: getOnlineMatchCompletedAt(lastOnline),
        beforeId: lastOnline.id,
        limit: HISTORY_PAGE_SIZE,
      })
      setOnlineMatches((current) => {
        const known = new Set(current.map((match) => match.id))
        return [...current, ...more.filter((match) => !known.has(match.id))]
      })
      setOnlineHasMore(more.length === HISTORY_PAGE_SIZE)
    } catch {
      setOnlineHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [
    loadingMore,
    localEntries,
    onlineEntries,
    onlineHasMore,
    onlineMatches,
    shouldLoadOnlineHistory,
    user,
    visibleCount,
  ])

  const hasSavedGames = sessions.length > 0
  const syncLabel = getSyncStatusLabel(syncStatus)
  const hasMore = page.hasMore || onlineHasMore

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
                  <Text
                    asChild
                    fontWeight="semibold"
                    color="white"
                    textDecoration="underline"
                    textUnderlineOffset="3px"
                  >
                    <RouterLink to={`/players/${user.id}`}>
                      {profile?.displayName ?? user.email ?? 'Signed in'}
                    </RouterLink>
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

          <HistoryList
            entries={page.entries}
            hasMore={hasMore}
            onLoadMore={() => {
              void handleLoadMore()
            }}
            onSelectSession={handleSelectSession}
            onSelectOnlineMatch={(match, resultSummary) => {
              void handleSelectOnlineMatch(match, resultSummary)
            }}
          />
        </Stack>
      </Box>
      <SessionSummaryDialog
        open={selectedSession !== null}
        session={selectedSession}
        onClose={() => {
          setSelectedSession(null)
        }}
      />
      <OnlineMatchSummaryDialog
        open={selectedOnlineMatch !== null}
        match={selectedOnlineMatch?.match ?? null}
        viewerUserId={user?.id ?? ''}
        resultSummary={selectedOnlineMatch?.resultSummary ?? ''}
        onClose={() => {
          setSelectedOnlineMatch(null)
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
