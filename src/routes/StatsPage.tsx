import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContentContainer } from '../components/ContentContainer'
import { StatTimelineDialog } from '../components/StatTimelineDialog/StatTimelineDialog'
import {
  EmptySection,
  PracticeSection,
  X01LegSection,
} from '../components/StatsPageSections/StatsPageSections'
import { TotalDartsHero } from '../components/StatsPageSections/TotalDartsHero'
import { computeAnalytics } from '../lib/analytics/computeAnalytics'
import type { DateRangePreset } from '../lib/analytics/sessionFilters'
import { filterSessions } from '../lib/analytics/sessionFilters'
import { buildStatTimeline } from '../lib/analytics/statTimelines'
import type { StatTimeline, StatTimelineSelection } from '../lib/analytics/statTimelines'
import { loadStoredSessions } from '../lib/storage/gameStore'
import { useAuth } from '../hooks/authContext'
import { AuthStatus, SyncStatus } from '../types/auth'

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
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
  const { authStatus, syncStatus } = useAuth()
  const [dateRange, setDateRange] = useState<DateRangePreset>('all')
  const [timelineSelection, setTimelineSelection] = useState<StatTimelineSelection | null>(null)
  const [storedSessions, setStoredSessions] = useState(() => loadStoredSessions())

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

  const filteredSessions = useMemo(
    () => filterSessions(storedSessions, { dateRange }),
    [storedSessions, dateRange],
  )

  const analytics = useMemo(
    () => computeAnalytics(storedSessions, { dateRange }),
    [storedSessions, dateRange],
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
              Progress from your completed games, grouped by game type.
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
              <X01LegSection x01={analytics.x01} onStatSelect={handleStatSelect} />
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
      />
    </ContentContainer>
  )
}
