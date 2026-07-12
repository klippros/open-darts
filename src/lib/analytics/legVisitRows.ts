import type { Visit } from '../../types/visit'

export interface LegVisitTableRow {
  id: string
  label: string
  getCellValue: (playerId: string) => string
  getCellColor?: (playerId: string) => string | undefined
}

export const formatLegVisitScore = (visit: Visit): string => {
  if (visit.bust) {
    return 'Bust'
  }

  return String(visit.visitScore)
}

const getVisitCellValue = (visit: Visit | undefined): string =>
  visit === undefined ? '—' : formatLegVisitScore(visit)

const getVisitCellColor = (visit: Visit | undefined): string | undefined =>
  visit?.bust === true ? 'red.300' : undefined

const buildChronologicalLegVisitRows = (legVisits: Visit[]): LegVisitTableRow[] =>
  legVisits.map((visit, index) => ({
    id: `leg-visit-${visit.visitIndex}`,
    label: `Visit ${index + 1}`,
    getCellValue: (playerId) => (visit.playerId === playerId ? formatLegVisitScore(visit) : '—'),
    getCellColor: (playerId) => (visit.playerId === playerId && visit.bust ? 'red.300' : undefined),
  }))

const buildPairedLegVisitRows = (legVisits: Visit[], playerIds: string[]): LegVisitTableRow[] => {
  const visitsByPlayer = Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      legVisits.filter((visit) => visit.playerId === playerId),
    ]),
  ) as Record<string, Visit[]>

  const rowCount = Math.max(
    ...playerIds.map((playerId) => visitsByPlayer[playerId]?.length ?? 0),
    0,
  )

  return Array.from({ length: rowCount }, (_, index) => ({
    id: `leg-visit-round-${index + 1}`,
    label: `Visit ${index + 1}`,
    getCellValue: (playerId) => getVisitCellValue(visitsByPlayer[playerId]?.[index]),
    getCellColor: (playerId) => getVisitCellColor(visitsByPlayer[playerId]?.[index]),
  }))
}

export const buildLegVisitRows = (legVisits: Visit[], playerIds: string[]): LegVisitTableRow[] => {
  if (playerIds.length === 2) {
    return buildPairedLegVisitRows(legVisits, playerIds)
  }

  return buildChronologicalLegVisitRows(legVisits)
}
