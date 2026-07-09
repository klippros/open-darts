import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { gameModeDefinitions } from '../game/gameModeDefinitions'
import { getSessionModeLabel } from '../history/sessionSummary'
import type { AnalyticsFilter } from './sessionFilters'
import { filterSessions } from './sessionFilters'
import {
  countCheckoutVisits,
  getPrimaryPlayerVisits,
  getThreeDartAverage,
  isCheckoutPracticeMode,
  sessionFinishedWithCheckout,
} from './visitStats'

export interface AnalyticsSnapshot {
  gameCount: number
  visitCount: number
  threeDartAverage: number | null
  checkoutRate: number | null
  avgVisitsPerGame: number | null
}

export interface ModeAnalyticsRow extends AnalyticsSnapshot {
  mode: GameModeId
  label: string
}

export interface AnalyticsResult {
  filter: AnalyticsFilter
  overview: AnalyticsSnapshot
  byMode: ModeAnalyticsRow[]
}

const collectVisits = (sessions: GameSession[]) =>
  sessions.flatMap((session) => getPrimaryPlayerVisits(session))

const computeCheckoutRate = (sessions: GameSession[]): number | null => {
  const checkoutSessions = sessions.filter((session) => isCheckoutPracticeMode(session.mode))

  if (checkoutSessions.length === 0) {
    return null
  }

  let checkoutEvents = 0
  let checkoutOpportunities = 0

  for (const session of checkoutSessions) {
    const visits = getPrimaryPlayerVisits(session)

    if (session.mode === GameModeId.X01) {
      checkoutOpportunities += 1

      if (sessionFinishedWithCheckout(session)) {
        checkoutEvents += 1
      }

      continue
    }

    checkoutOpportunities += visits.length
    checkoutEvents += countCheckoutVisits(visits)
  }

  if (checkoutOpportunities === 0) {
    return null
  }

  return (checkoutEvents / checkoutOpportunities) * 100
}

export const computeAnalyticsSnapshot = (sessions: GameSession[]): AnalyticsSnapshot => {
  const visits = collectVisits(sessions)
  const gameCount = sessions.length

  return {
    gameCount,
    visitCount: visits.length,
    threeDartAverage: getThreeDartAverage(visits),
    checkoutRate: computeCheckoutRate(sessions),
    avgVisitsPerGame: gameCount === 0 ? null : visits.length / gameCount,
  }
}

export const computeModeBreakdown = (sessions: GameSession[]): ModeAnalyticsRow[] => {
  const sessionsByMode = new Map<GameModeId, GameSession[]>()

  for (const session of sessions) {
    const modeSessions = sessionsByMode.get(session.mode) ?? []
    modeSessions.push(session)
    sessionsByMode.set(session.mode, modeSessions)
  }

  return [...sessionsByMode.entries()]
    .flatMap(([mode, modeSessions]) => {
      const [firstSession] = modeSessions

      if (firstSession === undefined) {
        return []
      }

      const snapshot = computeAnalyticsSnapshot(modeSessions)

      return [
        {
          mode,
          label: getSessionModeLabel(firstSession),
          gameCount: snapshot.gameCount,
          visitCount: snapshot.visitCount,
          threeDartAverage: snapshot.threeDartAverage,
          checkoutRate: snapshot.checkoutRate,
          avgVisitsPerGame: snapshot.avgVisitsPerGame,
        },
      ]
    })
    .sort((left, right) => left.label.localeCompare(right.label))
}

export const computeAnalytics = (
  sessions: GameSession[],
  filter: AnalyticsFilter,
): AnalyticsResult => {
  const filtered = filterSessions(sessions, filter)

  return {
    filter,
    overview: computeAnalyticsSnapshot(filtered),
    byMode: computeModeBreakdown(filtered),
  }
}

export const getAnalyticsModeOptions = (): { value: GameModeId; label: string }[] =>
  Object.values(gameModeDefinitions).map((definition) => ({
    value: definition.mode,
    label: definition.label,
  }))
