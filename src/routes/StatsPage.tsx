import { Box, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { ContentContainer } from '../components/ContentContainer'
import { computeAnalytics, getAnalyticsModeOptions } from '../lib/analytics/computeAnalytics'
import type { AnalyticsSnapshot, ModeAnalyticsRow } from '../lib/analytics/computeAnalytics'
import { formatAverage, formatCount, formatPercent } from '../lib/analytics/formatAnalytics'
import type { DateRangePreset } from '../lib/analytics/sessionFilters'
import { loadStoredSessions } from '../lib/storage/gameStore'
import { GameModeId } from '../types/gameMode'

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

const gameModeIds = new Set<string>(Object.values(GameModeId))

const isGameModeFilter = (value: string): value is GameModeId | 'all' =>
  value === 'all' || gameModeIds.has(value)

const isDateRangePreset = (value: string): value is DateRangePreset =>
  value === 'all' || value === '7d' || value === '30d'

interface StatCardProps {
  label: string
  value: string
}

const StatCard = ({ label, value }: StatCardProps) => (
  <Box
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    borderRadius="lg"
    bg="whiteAlpha.50"
    px={5}
    py={4}
  >
    <Text fontSize="sm" color="whiteAlpha.700" mb={1}>
      {label}
    </Text>
    <Text color="white" fontFamily="Archivo Black, sans-serif" fontSize="2xl" lineHeight="1">
      {value}
    </Text>
  </Box>
)

const OverviewCards = ({ snapshot }: { snapshot: AnalyticsSnapshot }) => (
  <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={3}>
    <StatCard label="Games played" value={String(snapshot.gameCount)} />
    <StatCard label="3-dart average" value={formatAverage(snapshot.threeDartAverage)} />
    <StatCard label="Checkout rate" value={formatPercent(snapshot.checkoutRate)} />
    <StatCard label="Visits per game" value={formatCount(snapshot.avgVisitsPerGame)} />
  </SimpleGrid>
)

const ModeBreakdown = ({ rows }: { rows: ModeAnalyticsRow[] }) => {
  if (rows.length === 0) {
    return null
  }

  return (
    <Stack gap={3}>
      <Heading as="h2" size="lg" color="white" fontFamily="Archivo Black, sans-serif">
        By mode
      </Heading>
      <Stack gap={3}>
        {rows.map((row) => (
          <Box
            key={row.mode}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            bg="whiteAlpha.50"
            px={5}
            py={4}
          >
            <Stack gap={3}>
              <Stack gap={1}>
                <Text fontWeight="semibold" color="white">
                  {row.label}
                </Text>
                <Text fontSize="sm" color="whiteAlpha.700">
                  {row.gameCount} game{row.gameCount === 1 ? '' : 's'} · {row.visitCount} visit
                  {row.visitCount === 1 ? '' : 's'}
                </Text>
              </Stack>
              <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
                <Text fontSize="sm" color="whiteAlpha.900">
                  Avg: {formatAverage(row.threeDartAverage)}
                </Text>
                <Text fontSize="sm" color="whiteAlpha.900">
                  Checkout: {formatPercent(row.checkoutRate)}
                </Text>
                <Text fontSize="sm" color="whiteAlpha.900">
                  Visits/game: {formatCount(row.avgVisitsPerGame)}
                </Text>
              </SimpleGrid>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}

export const StatsPage = () => {
  const [mode, setMode] = useState<GameModeId | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRangePreset>('all')
  const modeOptions = useMemo(() => getAnalyticsModeOptions(), [])

  const analytics = useMemo(
    () => computeAnalytics(loadStoredSessions(), { mode, dateRange }),
    [mode, dateRange],
  )

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10} maxW="720px" w="full" mx="auto">
        <Stack gap={8}>
          <Stack gap={3}>
            <Heading as="h1" size="2xl" color="white" fontFamily="Archivo Black, sans-serif">
              Stats
            </Heading>
            <Text color="whiteAlpha.800" fontSize="md" lineHeight="1.65">
              Simple progress insights from your saved games on this device.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
            <Stack gap={2}>
              <Text fontSize="sm" color="whiteAlpha.700">
                Mode
              </Text>
              <select
                style={filterSelectStyle}
                value={mode}
                onChange={(event) => {
                  const { value } = event.target

                  if (isGameModeFilter(value)) {
                    setMode(value)
                  }
                }}
              >
                <option value="all">All modes</option>
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Stack>
            <Stack gap={2}>
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
          </SimpleGrid>

          {analytics.overview.gameCount === 0 ? (
            <Box
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              borderRadius="lg"
              bg="whiteAlpha.50"
              px={5}
              py={5}
            >
              <Text color="whiteAlpha.800" lineHeight="1.65">
                No saved games match these filters yet. Finish a game and save it to history to see
                stats here.
              </Text>
            </Box>
          ) : (
            <>
              <OverviewCards snapshot={analytics.overview} />
              {mode === 'all' && analytics.byMode.length > 1 && (
                <ModeBreakdown rows={analytics.byMode} />
              )}
            </>
          )}
        </Stack>
      </Box>
    </ContentContainer>
  )
}
