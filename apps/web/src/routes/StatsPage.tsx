import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContentContainer } from '../components/ContentContainer'
import { SessionSummaryDialog } from '../components/MatchSummaryDialog/SessionSummaryDialog'
import { StatTimelineDialog } from '../components/StatTimelineDialog/StatTimelineDialog'
import {
  EmptySection,
  PracticeSection,
  X01LegSection,
} from '../components/StatsPageSections/StatsPageSections'
import { TotalDartsHero } from '../components/StatsPageSections/TotalDartsHero'
import { computeAnalytics } from '@open-darts/analytics/computeAnalytics'
import { mergeSessionsForStats } from '../lib/analytics/mergeSessionsForStats'
import type { DateRangePreset } from '@open-darts/analytics/sessionFilters'
import { filterSessions } from '@open-darts/analytics/sessionFilters'
import { buildStatTimeline } from '../lib/analytics/statTimelines'
import type {
  StatTimeline,
  StatTimelinePoint,
  StatTimelineSelection,
} from '../lib/analytics/statTimelines'
import {
  getLegNumberFromTimelinePointId,
  getSessionIdFromTimelinePointId,
} from '@open-darts/analytics/x01LegSlices'
import { getDateRangeCompletedAfter } from '../lib/history/historyPager'
import { listMyOnlineMatchSessions } from '../lib/matchServer/api'
import { isOnlineMatchesEnabled } from '../lib/matchServer/config'
import { decorateOnlineSessionForViewer } from '../lib/matchServer/onlinePlay'
import { loadStoredSessions } from '../lib/storage/gameStore'
import { useAuth } from '../hooks/authContext'
import { AuthStatus, SyncStatus } from '../types/auth'
import type { GameSession } from '@open-darts/game/types/gameSession'

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: 'all', label: 'All time' },
]

const filterSelectStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  fontSize: '0.875rem',
} as const

const isDateRangePreset = (value: string): value is DateRangePreset =>
  value === 'all' || value === '7d' || value === '30d'

export const StatsPage = () => {
  const { authStatus, syncStatus, user, profile } = useAuth()
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d')
  const [timelineSelection, setTimelineSelection] = useState<StatTimelineSelection | null>(null)
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null)
  const [selectedLegNumber, setSelectedLegNumber] = useState<number | null>(null)
  const [storedSessions, setStoredSessions] = useState(() => loadStoredSessions())
  const [onlineSessions30d, setOnlineSessions30d] = useState<GameSession[]>([])
  const [onlineSessionsAll, setOnlineSessionsAll] = useState<GameSession[] | null>(null)

  const isSignedIn = authStatus === AuthStatus.Authenticated && user !== null
  const shouldLoadOnlineStats = isSignedIn && isOnlineMatchesEnabled

  useEffect(() => {
    if (authStatus === AuthStatus.Anonymous || authStatus === AuthStatus.Authenticated) {
      setStoredSessions(loadStoredSessions())
    }
  }, [authStatus])

  useEffect(() => {
    if (syncStatus === SyncStatus.Synced) {
      setStoredSessions(loadStoredSessions())
    }
  }, [syncStatus])

  useEffect(() => {
    if (!shouldLoadOnlineStats || user === null) {
      setOnlineSessions30d([])
      setOnlineSessionsAll(null)
      return undefined
    }

    let cancelled = false
    const viewerUserId = user.id
    const viewerDisplayName = profile?.displayName
    const completedAfter = getDateRangeCompletedAfter('30d')

    const loadOnlineStats = async () => {
      try {
        const sessions = await listMyOnlineMatchSessions(viewerUserId, completedAfter)

        if (cancelled) {
          return
        }

        setOnlineSessions30d(
          sessions.map((session) =>
            decorateOnlineSessionForViewer(session, viewerUserId, viewerDisplayName),
          ),
        )
      } catch {
        if (!cancelled) {
          setOnlineSessions30d([])
        }
      }
    }

    void loadOnlineStats()

    return () => {
      cancelled = true
    }
  }, [profile?.displayName, shouldLoadOnlineStats, user])

  useEffect(() => {
    if (!shouldLoadOnlineStats || user === null || dateRange !== 'all') {
      return undefined
    }

    if (onlineSessionsAll !== null) {
      return undefined
    }

    let cancelled = false
    const viewerUserId = user.id
    const viewerDisplayName = profile?.displayName

    const loadAllOnlineStats = async () => {
      try {
        const sessions = await listMyOnlineMatchSessions(viewerUserId, null)

        if (cancelled) {
          return
        }

        setOnlineSessionsAll(
          sessions.map((session) =>
            decorateOnlineSessionForViewer(session, viewerUserId, viewerDisplayName),
          ),
        )
      } catch {
        if (!cancelled) {
          setOnlineSessionsAll([])
        }
      }
    }

    void loadAllOnlineStats()

    return () => {
      cancelled = true
    }
  }, [dateRange, onlineSessionsAll, profile?.displayName, shouldLoadOnlineStats, user])

  const onlineSessions = useMemo(() => {
    if (dateRange === 'all') {
      return onlineSessionsAll ?? onlineSessions30d
    }

    return onlineSessions30d
  }, [dateRange, onlineSessions30d, onlineSessionsAll])

  const allSessions = useMemo(
    () => mergeSessionsForStats(storedSessions, onlineSessions),
    [onlineSessions, storedSessions],
  )

  const filteredSessions = useMemo(
    () => filterSessions(allSessions, { dateRange }),
    [allSessions, dateRange],
  )

  const analytics = useMemo(
    () => computeAnalytics(allSessions, { dateRange }),
    [allSessions, dateRange],
  )

  const activeTimeline = useMemo((): StatTimeline | null => {
    if (timelineSelection === null) {
      return null
    }

    return buildStatTimeline(filteredSessions, timelineSelection)
  }, [filteredSessions, timelineSelection])

  const handleStatSelect = useCallback((selection: StatTimelineSelection) => {
    setTimelineSelection(selection)
  }, [])

  const handleTimelineClose = useCallback(() => {
    setTimelineSelection(null)
  }, [])

  const handleTimelinePointClick = useCallback(
    (point: StatTimelinePoint) => {
      const sessionId = getSessionIdFromTimelinePointId(point.sessionId)
      const session =
        filteredSessions.find((candidate) => candidate.id === sessionId) ??
        allSessions.find((candidate) => candidate.id === sessionId) ??
        null

      if (session !== null) {
        setSelectedSession(session)
        setSelectedLegNumber(getLegNumberFromTimelinePointId(point.sessionId))
      }
    },
    [allSessions, filteredSessions],
  )

  const hasAnyData =
    analytics.x01.all.legCount > 0 ||
    analytics.practice.checkout.length > 0 ||
    analytics.practice.other.length > 0

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="720px" w="full" mx="auto">
        <Stack gap={8}>
          <Stack gap={3}>
            <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
              Stats
            </Heading>
            <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
              {shouldLoadOnlineStats
                ? 'Progress from your completed local and online games, grouped by game type.'
                : 'Progress from your completed games, grouped by game type.'}
            </Text>
          </Stack>

          <Stack gap={2} maxW="320px">
            <Text fontSize="sm" color="whiteAlpha.700">
              Date range
            </Text>
            <select
              style={filterSelectStyle}
              value={dateRange}
              onChange={(event) => {
                const { value } = event.target

                if (isDateRangePreset(value)) {
                  setDateRange(value)
                }
              }}
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Stack>

          {hasAnyData ? (
            <>
              <TotalDartsHero sessions={filteredSessions} />
              <X01LegSection sessions={filteredSessions} onStatSelect={handleStatSelect} />
              <PracticeSection
                checkout={analytics.practice.checkout}
                other={analytics.practice.other}
                onStatSelect={handleStatSelect}
              />
            </>
          ) : (
            <EmptySection message="No saved games in this period yet. Finish a game and save it to history to see stats here." />
          )}
        </Stack>
      </Box>
      <StatTimelineDialog
        open={timelineSelection !== null}
        timeline={activeTimeline}
        onClose={handleTimelineClose}
        onPointClick={handleTimelinePointClick}
      />
      <SessionSummaryDialog
        open={selectedSession !== null}
        session={selectedSession}
        initialLegNumber={selectedLegNumber}
        onClose={() => {
          setSelectedSession(null)
          setSelectedLegNumber(null)
        }}
      />
    </ContentContainer>
  )
}
