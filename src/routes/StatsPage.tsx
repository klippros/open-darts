import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { BetaBanner } from '../components/BetaBanner/BetaBanner'
import { ContentContainer } from '../components/ContentContainer'
import { StatTimelineDialog } from '../components/StatTimelineDialog/StatTimelineDialog'
import {
  EmptySection,
  PracticeSection,
  X01LegSection,
} from '../components/StatsPageSections/StatsPageSections'
import { computeAnalytics } from '../lib/analytics/computeAnalytics'
import type { DateRangePreset } from '../lib/analytics/sessionFilters'
import { filterSessions } from '../lib/analytics/sessionFilters'
import { buildStatTimeline } from '../lib/analytics/statTimelines'
import type { StatTimeline, StatTimelineSelection } from '../lib/analytics/statTimelines'
import { loadStoredSessions } from '../lib/storage/gameStore'

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
  const [dateRange, setDateRange] = useState<DateRangePreset>('all')
  const [timelineSelection, setTimelineSelection] = useState<StatTimelineSelection | null>(null)

  const storedSessions = useMemo(() => loadStoredSessions(), [])

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
    analytics.x01.fiveOhOne.gameCount > 0 ||
    analytics.x01.other.gameCount > 0 ||
    analytics.practice.checkout.length > 0 ||
    analytics.practice.other.length > 0

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="720px" w="full" mx="auto">
        <Stack gap={8}>
          <BetaBanner title="Stats are in beta">
            Analytics and charts are a first draft. Metrics and layouts will evolve as we learn what
            is most useful.
          </BetaBanner>

          <Stack gap={3}>
            <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
              Stats
            </Heading>
            <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
              Progress from your saved games on this device, grouped by game type.
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
              <X01LegSection
                title="501"
                subtitle="Scoring and checkout stats from your saved 501 legs."
                emptyMessage="No saved 501 games in this period yet."
                stats={analytics.x01.fiveOhOne}
                avgDartsLabel="Avg darts"
                scope={{ type: 'x01-501' }}
                onStatSelect={handleStatSelect}
              />
              {analytics.x01.other.gameCount > 0 && (
                <X01LegSection
                  title="Other x01"
                  subtitle="301, 401, and custom x01 legs kept separate from 501."
                  emptyMessage="No saved other x01 games in this period yet."
                  stats={analytics.x01.other}
                  avgDartsLabel="Avg darts"
                  scope={{ type: 'x01-other' }}
                  onStatSelect={handleStatSelect}
                />
              )}
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
