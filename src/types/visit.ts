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
}

export const VISIT_SCORE_DART_COUNT = 3

export const getVisitDartCount = (visit: Visit): number =>
  visit.inputMode === VisitInputMode.VisitScore ? VISIT_SCORE_DART_COUNT : visit.darts.length

export const visitUsesVisitScoreInput = (visit: Visit): boolean =>
  visit.inputMode === VisitInputMode.VisitScore

export const visitsIncludeVisitScoreInput = (visits: Visit[]): boolean =>
  visits.some(visitUsesVisitScoreInput)
