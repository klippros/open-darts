import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { getAroundTheClockConfig } from '../aroundTheClock/aroundTheClockConfig'
import { getSessionCompletedAt, getSessionModeLabel } from '../history/sessionSummary'
import { isX01Config } from '../game/gameConfigGuards'
import { getDoubleCheckoutRate } from './formatAnalytics'
import { computePlayerStatsForVisits } from './matchPlayerStats'
import {
  filterAroundTheClockSessions,
  filterBob27Sessions,
  filterCheckoutPracticeSessions,
  filterFiveOhOneSessions,
  filterOtherX01Sessions,
} from './sessionScope'
import {
  countDartsInSession,
  getPrimaryPlayerVisits,
  getScoringVisits,
  getSessionCheckoutRate,
  getSessionFinalScore,
  getThreeDartAverage,
  sessionFinishedWithCheckout,
} from './visitStats'

export type StatMetricId =
  | 'threeDartAverage'
  | 'threeDartAverageUntil170'
  | 'bestGameAverage'
  | 'thrown180'
  | 'thrown140Plus'
  | 'thrown100Plus'
  | 'highestVisit'
  | 'doubleCheckoutRate'
  | 'checkouts100Plus'
  | 'highestCheckout'
  | 'checkoutRate'
  | 'avgDarts'
  | 'avgVisits'
  | 'avgFinalScore'
  | 'bestDarts'
  | 'completionRate'

export type StatTimelineScope =
  | { type: 'x01-501' }
  | { type: 'x01-other' }
  | { type: 'practice-checkout'; mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown }
  | { type: 'practice-bob27' }
  | { type: 'practice-around-the-clock'; aimMode?: AroundTheClockAimMode }

export interface StatTimelineSelection {
  scope: StatTimelineScope
  metric: StatMetricId
  metricLabel: string
  scopeLabel: string
}

export type StatTimelineFormat = 'average' | 'percent' | 'integer' | 'count'

export interface StatTimelinePoint {
  sessionId: string
  completedAt: string
  sessionLabel: string
  value: number | null
}

export interface StatTimeline {
  metricLabel: string
  scopeLabel: string
  format: StatTimelineFormat
  points: StatTimelinePoint[]
}

const getX01SessionPlayerStats = (session: GameSession) => {
  if (!isX01Config(session.mode, session.config)) {
    return null
  }

  return computePlayerStatsForVisits(
    getPrimaryPlayerVisits(session),
    {
      doubleIn: session.config.doubleIn,
      doubleOut: session.config.doubleOut,
    },
    session.config.doubleIn,
  )
}

const getX01SessionMetric = (session: GameSession, metric: StatMetricId): number | null => {
  const visits = getPrimaryPlayerVisits(session)
  const playerStats = getX01SessionPlayerStats(session)

  switch (metric) {
    case 'threeDartAverage':
    case 'bestGameAverage':
      return getThreeDartAverage(visits)
    case 'threeDartAverageUntil170':
      return getThreeDartAverage(getScoringVisits(visits))
    case 'thrown180':
      return playerStats?.thrown180 ?? null
    case 'thrown140Plus':
      return playerStats?.thrown140Plus ?? null
    case 'thrown100Plus':
      return playerStats?.thrown100Plus ?? null
    case 'highestVisit':
      return playerStats?.highestVisit ?? null
    case 'doubleCheckoutRate':
      return getDoubleCheckoutRate(playerStats?.doubleCheckout ?? { attempts: 0, successes: 0 })
    case 'checkouts100Plus':
      return playerStats?.checkouts100Plus ?? null
    case 'highestCheckout':
      return playerStats?.highestCheckout ?? null
    case 'avgDarts':
      return sessionFinishedWithCheckout(session) ? countDartsInSession(session) : null
    case 'checkoutRate':
    case 'avgVisits':
    case 'avgFinalScore':
    case 'bestDarts':
    case 'completionRate':
      return null
  }

  return null
}

const getCheckoutPracticeSessionMetric = (
  session: GameSession,
  metric: StatMetricId,
): number | null => {
  switch (metric) {
    case 'checkoutRate':
      return getSessionCheckoutRate(session)
    case 'threeDartAverage':
      return getThreeDartAverage(getPrimaryPlayerVisits(session))
    case 'threeDartAverageUntil170':
    case 'bestGameAverage':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'doubleCheckoutRate':
    case 'checkouts100Plus':
    case 'highestCheckout':
    case 'avgDarts':
    case 'avgVisits':
    case 'avgFinalScore':
    case 'bestDarts':
    case 'completionRate':
      return null
  }

  return null
}

const getBob27SessionMetric = (session: GameSession, metric: StatMetricId): number | null => {
  switch (metric) {
    case 'avgVisits':
      return getPrimaryPlayerVisits(session).length
    case 'avgFinalScore':
      return getSessionFinalScore(session)
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
    case 'bestGameAverage':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'doubleCheckoutRate':
    case 'checkouts100Plus':
    case 'highestCheckout':
      return null
    case 'avgDarts':
    case 'bestDarts':
    case 'completionRate':
      return null
  }

  return null
}

const getAroundTheClockSessionMetric = (
  session: GameSession,
  metric: StatMetricId,
  aimMode?: AroundTheClockAimMode,
): number | null => {
  if (aimMode !== undefined && getAroundTheClockConfig(session.config).aimMode !== aimMode) {
    return null
  }

  const dartCount = countDartsInSession(session)
  const isCompleted = session.finishedEarly !== true

  switch (metric) {
    case 'completionRate':
      return isCompleted ? 100 : 0
    case 'avgDarts':
      return isCompleted ? dartCount : null
    case 'bestDarts':
      return isCompleted ? dartCount : null
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
    case 'bestGameAverage':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'doubleCheckoutRate':
    case 'checkouts100Plus':
    case 'highestCheckout':
    case 'checkoutRate':
    case 'avgVisits':
    case 'avgFinalScore':
      return null
  }

  return null
}

export const getStatTimelineFormat = (metric: StatMetricId): StatTimelineFormat => {
  switch (metric) {
    case 'checkoutRate':
    case 'doubleCheckoutRate':
    case 'completionRate':
      return 'percent'
    case 'avgDarts':
    case 'avgVisits':
    case 'avgFinalScore':
    case 'bestDarts':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'checkouts100Plus':
    case 'highestCheckout':
      return 'integer'
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
    case 'bestGameAverage':
      return 'average'
  }

  return 'average'
}

const filterSessionsForScope = (
  sessions: GameSession[],
  scope: StatTimelineScope,
): GameSession[] => {
  switch (scope.type) {
    case 'x01-501':
      return filterFiveOhOneSessions(sessions)
    case 'x01-other':
      return filterOtherX01Sessions(sessions)
    case 'practice-checkout':
      return filterCheckoutPracticeSessions(sessions, scope.mode)
    case 'practice-bob27':
      return filterBob27Sessions(sessions)
    case 'practice-around-the-clock':
      return filterAroundTheClockSessions(sessions, scope.aimMode)
    default:
      return []
  }
}

const getSessionMetricValue = (
  session: GameSession,
  selection: StatTimelineSelection,
): number | null => {
  switch (selection.scope.type) {
    case 'x01-501':
    case 'x01-other':
      return getX01SessionMetric(session, selection.metric)
    case 'practice-checkout':
      return getCheckoutPracticeSessionMetric(session, selection.metric)
    case 'practice-bob27':
      return getBob27SessionMetric(session, selection.metric)
    case 'practice-around-the-clock':
      return getAroundTheClockSessionMetric(session, selection.metric, selection.scope.aimMode)
    default:
      return null
  }
}

export const buildStatTimeline = (
  sessions: GameSession[],
  selection: StatTimelineSelection,
): StatTimeline => {
  const scopedSessions = filterSessionsForScope(sessions, selection.scope).sort((left, right) =>
    getSessionCompletedAt(left).localeCompare(getSessionCompletedAt(right)),
  )

  return {
    metricLabel: selection.metricLabel,
    scopeLabel: selection.scopeLabel,
    format: getStatTimelineFormat(selection.metric),
    points: scopedSessions.map((session) => ({
      sessionId: session.id,
      completedAt: getSessionCompletedAt(session),
      sessionLabel: getSessionModeLabel(session),
      value: getSessionMetricValue(session, selection),
    })),
  }
}

export const hasPlottableTimeline = (timeline: StatTimeline): boolean =>
  timeline.points.some((point) => point.value !== null)
