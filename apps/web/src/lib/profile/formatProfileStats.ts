import type {
  PlayerProfileStats,
  ProfileAroundTheClockStats,
  ProfileBob27Stats,
  ProfileFiveOhOneStats,
  ProfileNinetyNineDartsStats,
  ProfileStatWindow,
} from '@open-darts/analytics'

export interface ProfileStatRow {
  label: string
  value: string
}

const formatNumber = (value: number | null, digits = 1): string | null => {
  if (value === null) {
    return null
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(digits)
}

const formatPercent = (value: number | null): string | null => {
  if (value === null) {
    return null
  }

  return `${value.toFixed(1)}%`
}

const pushRow = (rows: ProfileStatRow[], label: string, value: string | null): void => {
  if (value !== null) {
    rows.push({ label, value })
  }
}

export const formatProfileWindowLabel = (window: ProfileStatWindow): string => {
  const format = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
  return `${format.format(new Date(window.startAt))} – ${format.format(new Date(window.endAt))}`
}

export const buildFiveOhOneRows = (stats: ProfileFiveOhOneStats): ProfileStatRow[] => {
  const rows: ProfileStatRow[] = []
  pushRow(rows, '3-dart average', formatNumber(stats.threeDartAverage))
  pushRow(rows, '3-dart average to 170', formatNumber(stats.threeDartAverageUntil170))
  pushRow(rows, 'Checkout %', formatPercent(stats.checkoutPercent))
  pushRow(rows, '501 legs played', formatNumber(stats.legsPlayed, 0))
  pushRow(rows, '501 leg win rate', formatPercent(stats.legWinRate))
  pushRow(rows, 'Darts thrown', formatNumber(stats.dartsThrown, 0))
  pushRow(rows, 'Best leg', stats.bestLegDarts === null ? null : `${stats.bestLegDarts} darts`)
  pushRow(rows, 'Highest checkout', formatNumber(stats.highestCheckout, 0))
  if (stats.thrown180 !== null) {
    pushRow(rows, '180s', formatNumber(stats.thrown180, 0))
  } else {
    pushRow(rows, 'Highest visit', formatNumber(stats.highestVisit, 0))
  }
  return rows
}

export const buildBob27Rows = (stats: ProfileBob27Stats): ProfileStatRow[] => {
  const rows: ProfileStatRow[] = []
  pushRow(rows, 'Sessions played', formatNumber(stats.sessionsPlayed, 0))
  pushRow(rows, 'Avg score', formatNumber(stats.avgFinalScore))
  pushRow(rows, 'Hit rate', formatPercent(stats.hitRate))
  pushRow(rows, 'Best score', formatNumber(stats.bestFinalScore, 0))
  return rows
}

export const buildNinetyNineRows = (stats: ProfileNinetyNineDartsStats): ProfileStatRow[] => {
  const rows: ProfileStatRow[] = []
  pushRow(rows, 'Sessions played', formatNumber(stats.sessionsPlayed, 0))
  pushRow(rows, 'Avg score on 20', formatNumber(stats.avgFinalScore))
  pushRow(rows, 'Hit rate on 20', formatPercent(stats.hitRate))
  pushRow(rows, 'Avg trebles on 20', formatNumber(stats.avgTreblesPerGame))
  return rows
}

export const buildAroundTheClockRows = (stats: ProfileAroundTheClockStats): ProfileStatRow[] => {
  const rows: ProfileStatRow[] = []
  pushRow(rows, 'Sessions played', formatNumber(stats.sessionsPlayed, 0))
  pushRow(rows, 'Avg darts to finish', formatNumber(stats.avgDartsFullRun))
  pushRow(rows, 'Avg darts per field', formatNumber(stats.avgDartsPerField))
  pushRow(
    rows,
    'Best finish',
    stats.bestDartsFullRun === null ? null : `${stats.bestDartsFullRun} darts`,
  )
  return rows
}

export const profileHasAnyStats = (stats: PlayerProfileStats): boolean =>
  stats.fiveOhOne !== null ||
  stats.bob27 !== null ||
  stats.ninetyNineDarts !== null ||
  stats.aroundTheClock !== null
