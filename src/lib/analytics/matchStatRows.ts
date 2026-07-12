import type { X01LegStats } from './x01Stats'
import { formatAverage, formatDoubleCheckout, formatInteger } from './formatAnalytics'
import type { PlayerMatchStats } from './matchPlayerStats'
import { emptyPlayerMatchStats } from './matchPlayerStats'

export enum MatchStatRowId {
  ThreeDartAverage = 'threeDartAverage',
  Thrown180 = 'thrown180',
  Thrown140Plus = 'thrown140Plus',
  Thrown100Plus = 'thrown100Plus',
  HighestVisit = 'highestVisit',
  Checkouts = 'checkouts',
  Checkouts100Plus = 'checkouts100Plus',
  HighestCheckout = 'highestCheckout',
  BestGameAverage = 'bestGameAverage',
  ThreeDartAverageUntil170 = 'threeDartAverageUntil170',
  AvgDarts = 'avgDarts',
}

export interface MatchStatRowDefinition {
  id: MatchStatRowId
  label: string
  formatValue: (stats: PlayerMatchStats) => string
  isVisible: (statsByPlayer: Record<string, PlayerMatchStats>, playerIds: string[]) => boolean
}

const everyPlayerHas180 = (
  statsByPlayer: Record<string, PlayerMatchStats>,
  playerIds: string[],
): boolean => playerIds.every((playerId) => (statsByPlayer[playerId]?.thrown180 ?? 0) > 0)

const anyPlayerMatches = (
  statsByPlayer: Record<string, PlayerMatchStats>,
  playerIds: string[],
  predicate: (stats: PlayerMatchStats) => boolean,
): boolean =>
  playerIds.some((playerId) => predicate(statsByPlayer[playerId] ?? emptyPlayerMatchStats()))

const sharedMatchStatRows: MatchStatRowDefinition[] = [
  {
    id: MatchStatRowId.ThreeDartAverage,
    label: 'Avg (3-darts)',
    formatValue: (stats) => formatAverage(stats.threeDartAverage),
    isVisible: () => true,
  },
  {
    id: MatchStatRowId.ThreeDartAverageUntil170,
    label: 'Avg to 170 (3-darts)',
    formatValue: (stats) => formatAverage(stats.threeDartAverageUntil170),
    isVisible: () => true,
  },
  {
    id: MatchStatRowId.Thrown180,
    label: '180',
    formatValue: (stats) => formatInteger(stats.thrown180),
    isVisible: (statsByPlayer, playerIds) =>
      anyPlayerMatches(statsByPlayer, playerIds, (stats) => stats.thrown180 > 0),
  },
  {
    id: MatchStatRowId.Thrown140Plus,
    label: '140+',
    formatValue: (stats) => formatInteger(stats.thrown140Plus),
    isVisible: (statsByPlayer, playerIds) =>
      anyPlayerMatches(statsByPlayer, playerIds, (stats) => stats.thrown140Plus > 0),
  },
  {
    id: MatchStatRowId.Thrown100Plus,
    label: '100+',
    formatValue: (stats) => formatInteger(stats.thrown100Plus),
    isVisible: (statsByPlayer, playerIds) =>
      anyPlayerMatches(statsByPlayer, playerIds, (stats) => stats.thrown100Plus > 0),
  },
  {
    id: MatchStatRowId.HighestVisit,
    label: 'Highest visit',
    formatValue: (stats) => formatInteger(stats.highestVisit),
    isVisible: (statsByPlayer, playerIds) => !everyPlayerHas180(statsByPlayer, playerIds),
  },
  {
    id: MatchStatRowId.Checkouts,
    label: 'Checkouts',
    formatValue: (stats) => formatDoubleCheckout(stats.doubleCheckout),
    isVisible: () => true,
  },
  {
    id: MatchStatRowId.Checkouts100Plus,
    label: 'Checkouts 100+',
    formatValue: (stats) => formatInteger(stats.checkouts100Plus),
    isVisible: (statsByPlayer, playerIds) =>
      anyPlayerMatches(statsByPlayer, playerIds, (stats) => stats.checkouts100Plus > 0),
  },
  {
    id: MatchStatRowId.HighestCheckout,
    label: 'Highest checkout',
    formatValue: (stats) => formatInteger(stats.highestCheckout),
    isVisible: () => true,
  },
]

const statsPageOnlyRows: MatchStatRowDefinition[] = [
  {
    id: MatchStatRowId.BestGameAverage,
    label: 'Best game avg',
    formatValue: () => '—',
    isVisible: () => true,
  },
  {
    id: MatchStatRowId.AvgDarts,
    label: 'Avg darts',
    formatValue: () => '—',
    isVisible: () => true,
  },
]

export const getVisibleMatchStatRows = (
  statsByPlayer: Record<string, PlayerMatchStats>,
  playerIds: string[],
): MatchStatRowDefinition[] =>
  sharedMatchStatRows.filter((row) => row.isVisible(statsByPlayer, playerIds))

export const getVisibleStatsPageRows = (
  statsByPlayer: Record<string, PlayerMatchStats>,
  playerIds: string[],
): MatchStatRowDefinition[] => [
  ...getVisibleMatchStatRows(statsByPlayer, playerIds),
  ...statsPageOnlyRows,
]

export const x01LegStatsToPlayerMatchStats = (stats: X01LegStats): PlayerMatchStats => ({
  threeDartAverage: stats.threeDartAverage,
  threeDartAverageUntil170: stats.threeDartAverageUntil170,
  thrown180: stats.thrown180,
  thrown140Plus: stats.thrown140Plus,
  thrown100Plus: stats.thrown100Plus,
  doubleCheckout: stats.doubleCheckout,
  checkouts100Plus: stats.checkouts100Plus,
  highestCheckout: stats.highestCheckout,
  highestVisit: stats.highestVisit,
})

export const formatStatsPageRowValue = (rowId: MatchStatRowId, stats: X01LegStats): string => {
  switch (rowId) {
    case MatchStatRowId.BestGameAverage:
      return formatAverage(stats.bestGameAverage)
    case MatchStatRowId.AvgDarts:
      return formatInteger(stats.avgDarts)
    default:
      return (
        sharedMatchStatRows
          .find((row) => row.id === rowId)
          ?.formatValue(x01LegStatsToPlayerMatchStats(stats)) ?? '—'
      )
  }
}
