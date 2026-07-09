import { GameStatus } from '../../types/gameMode'
import type { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { getSessionCompletedAt } from '../history/sessionSummary'

export type DateRangePreset = 'all' | '7d' | '30d'

export interface AnalyticsFilter {
  mode: GameModeId | 'all'
  dateRange: DateRangePreset
}

const getDateRangeCutoff = (dateRange: DateRangePreset): string | null => {
  if (dateRange === 'all') {
    return null
  }

  const cutoff = new Date()
  const days = dateRange === '7d' ? 7 : 30
  cutoff.setDate(cutoff.getDate() - days)

  return cutoff.toISOString()
}

export const filterSessions = (sessions: GameSession[], filter: AnalyticsFilter): GameSession[] => {
  const cutoff = getDateRangeCutoff(filter.dateRange)

  return sessions.filter((session) => {
    if (session.status !== GameStatus.Completed) {
      return false
    }

    if (filter.mode !== 'all' && session.mode !== filter.mode) {
      return false
    }

    if (cutoff !== null && getSessionCompletedAt(session) < cutoff) {
      return false
    }

    return true
  })
}
