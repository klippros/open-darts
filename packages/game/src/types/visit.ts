import type { DartThrow } from './dart'

export enum VisitInputMode {
  PerDart = 'per-dart',
  VisitScore = 'visit-score',
}

export interface Visit {
  visitIndex: number
  playerId: string
  darts: DartThrow[]
  visitScore: number
  scoreBefore: number
  scoreAfter: number
  bust: boolean
  checkout: boolean
  legIndex?: number
  inputMode?: VisitInputMode
  metadata?: Record<string, unknown>
  /** Kept on the row but skipped when rebuilding engine state and stats. */
  voided?: boolean
}

export const VISIT_SCORE_DART_COUNT = 3

export const getVisitDartCount = (visit: Visit): number =>
  visit.inputMode === VisitInputMode.VisitScore ? VISIT_SCORE_DART_COUNT : visit.darts.length

export const visitUsesVisitScoreInput = (visit: Visit): boolean =>
  visit.inputMode === VisitInputMode.VisitScore

export const visitsIncludeVisitScoreInput = (visits: Visit[]): boolean =>
  visits.some(visitUsesVisitScoreInput)

export const isCountingVisit = (visit: Visit): boolean => visit.voided !== true

export const getCountingVisits = (visits: Visit[]): Visit[] => visits.filter(isCountingVisit)
