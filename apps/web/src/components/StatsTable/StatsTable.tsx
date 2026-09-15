import { Box, Grid, Stack, Text } from '@chakra-ui/react'
import type { MatchStatRowDefinition, MatchStatRowId } from '../../lib/analytics/matchStatRows'
import { getVisibleMatchStatRows } from '../../lib/analytics/matchStatRows'
import type { LegVisitTableRow } from '../../lib/analytics/legVisitRows'
import type { PlayerMatchStats } from '../../lib/analytics/matchPlayerStats'
import { emptyPlayerMatchStats } from '../../lib/analytics/matchPlayerStats'
import { PlayerMatchColumnHeader } from '../PlayerMatchColumnHeader/PlayerMatchColumnHeader'

export interface StatsTablePlayer {
  id: string
  name: string
}

export interface StatsTableProps {
  players: StatsTablePlayer[]
  statsByPlayer: Record<string, PlayerMatchStats>
  rows?: MatchStatRowDefinition[]
  formatCell?: (row: MatchStatRowDefinition, stats: PlayerMatchStats) => string
  onRowClick?: (rowId: MatchStatRowId) => void
  isRowClickable?: (rowId: MatchStatRowId) => boolean
  highlightPlayerIds?: string[]
  legStarterPlayerId?: string
  additionalRows?: LegVisitTableRow[]
}

export const StatsTable = ({
  players,
  statsByPlayer,
  rows,
  formatCell,
  onRowClick,
  isRowClickable,
  highlightPlayerIds = [],
  legStarterPlayerId,
  additionalRows = [],
}: StatsTableProps) => {
  const playerIds = players.map((player) => player.id)
  const visibleRows = rows ?? getVisibleMatchStatRows(statsByPlayer, playerIds)
  const showNamesRow = players.length === 2
  const valueColumns = Math.max(players.length, 1)
  const gridTemplateColumns = `minmax(8rem, 1.2fr) repeat(${valueColumns}, minmax(0, 1fr))`

  const getCellValue = (row: MatchStatRowDefinition, playerId: string): string => {
    const stats = statsByPlayer[playerId] ?? emptyPlayerMatchStats()

    if (formatCell !== undefined) {
      return formatCell(row, stats)
    }

    return row.formatValue(stats)
  }

  const rowIsClickable = (rowId: MatchStatRowId): boolean => {
    if (onRowClick === undefined) {
      return false
    }

    return isRowClickable?.(rowId) ?? true
  }

  const handleRowActivate = (rowId: MatchStatRowId) => {
    if (rowIsClickable(rowId)) {
      onRowClick?.(rowId)
    }
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      bg="whiteAlpha.50"
      overflow="hidden"
    >
      <Stack gap={0}>
        {showNamesRow && (
          <Grid templateColumns={gridTemplateColumns} px={4} py={2} columnGap={3}>
            <Box />
            {players.map((player) => (
              <Box key={`name-${player.id}`} textAlign="right">
                <PlayerMatchColumnHeader
                  name={player.name}
                  showTrophy={highlightPlayerIds.includes(player.id)}
                  showLegStarter={legStarterPlayerId === player.id}
                />
              </Box>
            ))}
          </Grid>
        )}

        {visibleRows.map((row, rowIndex) => {
          const clickable = rowIsClickable(row.id)
          const showTopBorder = rowIndex > 0 || showNamesRow

          return (
            <Grid
              key={row.id}
              templateColumns={gridTemplateColumns}
              px={4}
              py={2.5}
              columnGap={3}
              borderTopWidth={showTopBorder ? '1px' : undefined}
              borderColor="whiteAlpha.100"
              cursor={clickable ? 'pointer' : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              transition="background 0.15s ease"
              _hover={clickable ? { bg: 'whiteAlpha.100' } : undefined}
              _focusVisible={
                clickable
                  ? { outline: '2px solid', outlineColor: 'orange.300', outlineOffset: '-2px' }
                  : undefined
              }
              onClick={() => {
                handleRowActivate(row.id)
              }}
              onKeyDown={(event) => {
                if (!clickable) {
                  return
                }

                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleRowActivate(row.id)
                }
              }}
            >
              <Text fontSize="sm" color="whiteAlpha.700" alignSelf="center">
                {row.label}
              </Text>
              {players.map((player) => (
                <Text
                  key={`${row.id}-${player.id}`}
                  fontSize="sm"
                  color="whiteAlpha.900"
                  textAlign="right"
                  alignSelf="center"
                >
                  {getCellValue(row, player.id)}
                </Text>
              ))}
            </Grid>
          )
        })}

        {additionalRows.map((row, rowIndex) => {
          const showTopBorder = rowIndex > 0 || visibleRows.length > 0 || showNamesRow

          return (
            <Grid
              key={row.id}
              templateColumns={gridTemplateColumns}
              px={4}
              py={2.5}
              columnGap={3}
              borderTopWidth={showTopBorder ? '1px' : undefined}
              borderColor="whiteAlpha.100"
            >
              <Text fontSize="sm" color="whiteAlpha.700" alignSelf="center">
                {row.label}
              </Text>
              {players.map((player) => (
                <Text
                  key={`${row.id}-${player.id}`}
                  fontSize="sm"
                  color={row.getCellColor?.(player.id) ?? 'whiteAlpha.900'}
                  textAlign="right"
                  alignSelf="center"
                >
                  {row.getCellValue(player.id)}
                </Text>
              ))}
            </Grid>
          )
        })}
      </Stack>
    </Box>
  )
}
