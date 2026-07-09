import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { getSessionCompletedAt, getSessionModeLabel } from '../history/sessionSummary'
import { isX01Config } from '../game/gameConfigGuards'
import { MAX_CHECKOUT_SCORE } from '../x01/x01CheckoutSuggestions'
import { FIVE_OH_ONE_START_SCORE } from './x01Stats'
import {
  countCheckoutVisits,
  countDartsInSession,
  getPrimaryPlayerVisits,
  getThreeDartAverage,
  sessionFinishedWithCheckout,
} from './visitStats'

export type StatMetricId =
  | 'threeDartAverage'
  | 'threeDartAverageUntil170'
  | 'checkoutRate'
  | 'avgDarts'
  | 'avgVisits'
  | 'avgFinalScore'
  | 'bestDarts'

export type StatTimelineScope =
  | { type: 'x01-501' }
  | { type: 'x01-other' }
  | { type: 'practice-checkout'; mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown }
  | { type: 'practice-bob27' }
  | { type: 'practice-around-the-clock' }

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

const getScoringVisits = (session: GameSession) =>
  getPrimaryPlayerVisits(session).filter((visit) => visit.scoreBefore > MAX_CHECKOUT_SCORE)

const getFinalScore = (session: GameSession): number | null => {
  const lastVisit = getPrimaryPlayerVisits(session).at(-1)

  return lastVisit?.scoreAfter ?? null
}

const getX01SessionMetric = (session: GameSession, metric: StatMetricId): number | null => {
  const visits = getPrimaryPlayerVisits(session)

  switch (metric) {
    case 'threeDartAverage':
      return getThreeDartAverage(visits)
    case 'threeDartAverageUntil170':
      return getThreeDartAverage(getScoringVisits(session))
    case 'checkoutRate':
      return sessionFinishedWithCheckout(session) ? 100 : 0
    case 'avgDarts':
      return sessionFinishedWithCheckout(session) ? countDartsInSession(session) : null
    case 'avgVisits':
    case 'avgFinalScore':
    case 'bestDarts':
      return null
  }

  return null
}

const getCheckoutPracticeSessionMetric = (
  session: GameSession,
  metric: StatMetricId,
): number | null => {
  const visits = getPrimaryPlayerVisits(session)

  switch (metric) {
    case 'checkoutRate':
      return visits.length === 0 ? null : (countCheckoutVisits(visits) / visits.length) * 100
    case 'threeDartAverage':
      return getThreeDartAverage(visits)
    case 'threeDartAverageUntil170':
    case 'avgDarts':
    case 'avgVisits':
    case 'avgFinalScore':
    case 'bestDarts':
      return null
  }

  return null
}

const getBob27SessionMetric = (session: GameSession, metric: StatMetricId): number | null => {
  switch (metric) {
    case 'avgVisits':
      return getPrimaryPlayerVisits(session).length
    case 'avgFinalScore':
      return getFinalScore(session)
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
    case 'checkoutRate':
    case 'avgDarts':
    case 'bestDarts':
      return null
  }

  return null
}

const getAroundTheClockSessionMetric = (
  session: GameSession,
  metric: StatMetricId,
): number | null => {
  if (session.finishedEarly === true) {
    return null
  }

  const dartCount = countDartsInSession(session)

  switch (metric) {
    case 'avgDarts':
    case 'bestDarts':
      return dartCount
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
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
      return 'percent'
    case 'avgDarts':
    case 'avgVisits':
    case 'avgFinalScore':
    case 'bestDarts':
      return 'integer'
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
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
      return sessions.filter(
        (session) =>
          session.mode === GameModeId.X01 &&
          isX01Config(session.mode, session.config) &&
          session.config.startScore === FIVE_OH_ONE_START_SCORE,
      )
    case 'x01-other':
      return sessions.filter(
        (session) =>
          session.mode === GameModeId.X01 &&
          isX01Config(session.mode, session.config) &&
          session.config.startScore !== FIVE_OH_ONE_START_SCORE,
      )
    case 'practice-checkout':
      return sessions.filter((session) => session.mode === scope.mode)
    case 'practice-bob27':
      return sessions.filter((session) => session.mode === GameModeId.Bob27)
    case 'practice-around-the-clock':
      return sessions.filter((session) => session.mode === GameModeId.AroundTheClock)
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
      return getAroundTheClockSessionMetric(session, selection.metric)
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
