import type { AnalyticsFilter } from './sessionFilters'
import { filterSessions } from './sessionFilters'
import { computePracticeStats } from './practiceStats'
import type { PracticeStats } from './practiceStats'
import { computeX01Stats } from './x01Stats'
import type { X01Stats } from './x01Stats'

export interface AnalyticsResult {
  filter: AnalyticsFilter
  x01: X01Stats
  practice: PracticeStats
}

export const computeAnalytics = (
  sessions: Parameters<typeof filterSessions>[0],
  filter: AnalyticsFilter,
): AnalyticsResult => {
  const filtered = filterSessions(sessions, filter)

  return {
    filter,
    x01: computeX01Stats(filtered),
    practice: computePracticeStats(filtered),
  }
}

export type { X01LegStats, X01Stats } from './x01Stats'
export type { CheckoutPracticeStats, OtherPracticeStats, PracticeStats } from './practiceStats'
export type { Bob27PracticeStats, AroundTheClockPracticeStats } from './practiceStats'
