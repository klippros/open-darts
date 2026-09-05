import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import type { AroundTheClockAimMode } from '../../types/aroundTheClock'
import type { Visit } from '../../types/visit'
import { getAroundTheClockConfig } from '../aroundTheClock/aroundTheClockConfig'
import {
  getBob27AvgHitsPerVisit,
  getBob27SessionDoublesHit,
  getBob27VisitHitRate,
} from '../bob27/bob27VisitStats'
import {
  getSessionCheckoutCount,
  getHighestOneTwentyOneCheckoutTarget,
} from '../oneTwentyOne/oneTwentyOneVisitStats'
import { getSessionCompletedAt, getSessionModeLabel } from '../history/sessionSummary'
import { isAroundTheClockConfig, isX01Config } from '../game/gameConfigGuards'
import { getDoubleCheckoutRate } from './formatAnalytics'
import { computePlayerStatsForVisits } from './matchPlayerStats'
import {
  filterAllX01Sessions,
  filterAroundTheClockSessions,
  filterBob27Sessions,
  filterCheckoutPracticeSessions,
  filterFiveOhOneSessions,
  filterFourOhOneSessions,
  filterThreeOhOneSessions,
} from './sessionScope'
import {
  countDartsInSession,
  getHighestCheckout,
  getPrimaryPlayerVisits,
  getScoringVisits,
  getSessionCheckoutRate,
  getSessionFinalScore,
  getThreeDartAverage,
} from './visitStats'
import {
  countDartsInVisits,
  expandX01SessionLegs,
  getX01LegSlicePointId,
  legFinishedWithCheckout,
} from './x01LegSlices'
import type { X01LegSlice } from './x01LegSlices'

export type StatMetricId =
  | 'threeDartAverage'
  | 'threeDartAverageUntil170'
  | 'bestLegAverage'
  | 'thrown180'
  | 'thrown140Plus'
  | 'thrown100Plus'
  | 'highestVisit'
  | 'doubleCheckoutRate'
  | 'checkouts100Plus'
  | 'highestCheckout'
  | 'checkoutRate'
  | 'avgCheckoutsPerGame'
  | 'bestCheckoutsPerGame'
  | 'avgDarts'
  | 'avgFinalScore'
  | 'bestFinalScore'
  | 'hitRate'
  | 'avgHitsPerVisit'
  | 'avgDoublesPerGame'
  | 'bestDoublesPerGame'
  | 'bestDarts'
  | 'completionRate'

export type StatTimelineScope =
  | { type: 'x01-501' }
  | { type: 'x01-401' }
  | { type: 'x01-301' }
  | { type: 'x01-all' }
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
  pointUnitLabel: 'leg' | 'session'
  points: StatTimelinePoint[]
}

const getX01PlayerStatsForVisits = (session: GameSession, visits: Visit[]) => {
  if (!isX01Config(session.mode, session.config)) {
    return null
  }

  return computePlayerStatsForVisits(
    visits,
    {
      doubleIn: session.config.doubleIn,
      doubleOut: session.config.doubleOut,
    },
    session.config.doubleIn,
  )
}

const getX01LegMetric = (slice: X01LegSlice, metric: StatMetricId): number | null => {
  const { visits, session } = slice
  const playerStats = getX01PlayerStatsForVisits(session, visits)

  switch (metric) {
    case 'threeDartAverage':
    case 'bestLegAverage':
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
      return legFinishedWithCheckout(visits) ? countDartsInVisits(visits) : null
    case 'checkoutRate':
    case 'avgCheckoutsPerGame':
    case 'bestCheckoutsPerGame':
    case 'avgFinalScore':
    case 'bestFinalScore':
    case 'hitRate':
    case 'avgHitsPerVisit':
    case 'avgDoublesPerGame':
    case 'bestDoublesPerGame':
    case 'bestDarts':
    case 'completionRate':
      return null
  }

  return null
}

const getX01LegSessionLabel = (slice: X01LegSlice, legCountInSession: number): string => {
  const modeLabel = getSessionModeLabel(slice.session)

  if (legCountInSession <= 1) {
    return modeLabel
  }

  return `${modeLabel} · Leg ${slice.legNumber}`
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
    case 'avgCheckoutsPerGame':
    case 'bestCheckoutsPerGame':
      return getSessionCheckoutCount(session)
    case 'highestCheckout':
      return session.mode === GameModeId.OneTwentyOne
        ? getHighestOneTwentyOneCheckoutTarget(getPrimaryPlayerVisits(session))
        : getHighestCheckout(getPrimaryPlayerVisits(session))
    case 'threeDartAverageUntil170':
    case 'bestLegAverage':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'doubleCheckoutRate':
    case 'checkouts100Plus':
    case 'avgDarts':
    case 'avgFinalScore':
    case 'bestFinalScore':
    case 'hitRate':
    case 'avgHitsPerVisit':
    case 'avgDoublesPerGame':
    case 'bestDoublesPerGame':
    case 'bestDarts':
    case 'completionRate':
      return null
  }

  return null
}

const getBob27SessionMetric = (session: GameSession, metric: StatMetricId): number | null => {
  switch (metric) {
    case 'hitRate':
      return getBob27VisitHitRate(getPrimaryPlayerVisits(session))
    case 'avgHitsPerVisit':
      return getBob27AvgHitsPerVisit(getPrimaryPlayerVisits(session))
    case 'avgFinalScore':
    case 'bestFinalScore':
      return getSessionFinalScore(session)
    case 'avgDoublesPerGame':
    case 'bestDoublesPerGame':
      return getBob27SessionDoublesHit(session)
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
    case 'bestLegAverage':
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
    case 'checkoutRate':
    case 'avgCheckoutsPerGame':
    case 'bestCheckoutsPerGame':
      return null
  }

  return null
}

const getAroundTheClockSessionMetric = (
  session: GameSession,
  metric: StatMetricId,
  aimMode?: AroundTheClockAimMode,
): number | null => {
  if (
    aimMode !== undefined &&
    (!isAroundTheClockConfig(session.mode, session.config) ||
      getAroundTheClockConfig(session.config).aimMode !== aimMode)
  ) {
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
    case 'bestLegAverage':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'doubleCheckoutRate':
    case 'checkouts100Plus':
    case 'highestCheckout':
    case 'checkoutRate':
    case 'avgCheckoutsPerGame':
    case 'bestCheckoutsPerGame':
    case 'avgFinalScore':
    case 'bestFinalScore':
    case 'hitRate':
    case 'avgHitsPerVisit':
    case 'avgDoublesPerGame':
    case 'bestDoublesPerGame':
      return null
  }

  return null
}

export const getStatTimelineFormat = (metric: StatMetricId): StatTimelineFormat => {
  switch (metric) {
    case 'checkoutRate':
    case 'doubleCheckoutRate':
    case 'completionRate':
    case 'hitRate':
      return 'percent'
    case 'avgDarts':
    case 'avgFinalScore':
    case 'bestFinalScore':
    case 'bestDarts':
    case 'bestDoublesPerGame':
    case 'bestCheckoutsPerGame':
    case 'thrown180':
    case 'thrown140Plus':
    case 'thrown100Plus':
    case 'highestVisit':
    case 'checkouts100Plus':
    case 'highestCheckout':
      return 'integer'
    case 'threeDartAverage':
    case 'threeDartAverageUntil170':
    case 'bestLegAverage':
    case 'avgDoublesPerGame':
    case 'avgCheckoutsPerGame':
    case 'avgHitsPerVisit':
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
    case 'x01-401':
      return filterFourOhOneSessions(sessions)
    case 'x01-301':
      return filterThreeOhOneSessions(sessions)
    case 'x01-all':
      return filterAllX01Sessions(sessions)
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

const isX01TimelineScope = (scope: StatTimelineScope): boolean =>
  scope.type === 'x01-501' ||
  scope.type === 'x01-401' ||
  scope.type === 'x01-301' ||
  scope.type === 'x01-all'

const buildX01TimelinePoints = (
  sessions: GameSession[],
  metric: StatMetricId,
): StatTimelinePoint[] => {
  const points = sessions.flatMap((session) => {
    const legs = expandX01SessionLegs(session)

    return legs.map((slice) => ({
      sessionId: getX01LegSlicePointId(slice),
      completedAt: getSessionCompletedAt(session),
      sessionLabel: getX01LegSessionLabel(slice, legs.length),
      value: getX01LegMetric(slice, metric),
      legNumber: slice.legNumber,
    }))
  })

  return points
    .sort((left, right) => {
      const byCompletedAt = left.completedAt.localeCompare(right.completedAt)

      if (byCompletedAt !== 0) {
        return byCompletedAt
      }

      return left.legNumber - right.legNumber
    })
    .map(({ sessionId, completedAt, sessionLabel, value }) => ({
      sessionId,
      completedAt,
      sessionLabel,
      value,
    }))
}

const getPracticeSessionMetricValue = (
  session: GameSession,
  selection: StatTimelineSelection,
): number | null => {
  if (selection.scope.type === 'practice-checkout') {
    return getCheckoutPracticeSessionMetric(session, selection.metric)
  }

  if (selection.scope.type === 'practice-bob27') {
    return getBob27SessionMetric(session, selection.metric)
  }

  if (selection.scope.type === 'practice-around-the-clock') {
    return getAroundTheClockSessionMetric(session, selection.metric, selection.scope.aimMode)
  }

  return null
}

export const buildStatTimeline = (
  sessions: GameSession[],
  selection: StatTimelineSelection,
): StatTimeline => {
  const scopedSessions = filterSessionsForScope(sessions, selection.scope)

  if (isX01TimelineScope(selection.scope)) {
    return {
      metricLabel: selection.metricLabel,
      scopeLabel: selection.scopeLabel,
      format: getStatTimelineFormat(selection.metric),
      pointUnitLabel: 'leg',
      points: buildX01TimelinePoints(scopedSessions, selection.metric),
    }
  }

  const sortedSessions = [...scopedSessions].sort((left, right) =>
    getSessionCompletedAt(left).localeCompare(getSessionCompletedAt(right)),
  )

  return {
    metricLabel: selection.metricLabel,
    scopeLabel: selection.scopeLabel,
    format: getStatTimelineFormat(selection.metric),
    pointUnitLabel: 'session',
    points: sortedSessions.map((session) => ({
      sessionId: session.id,
      completedAt: getSessionCompletedAt(session),
      sessionLabel: getSessionModeLabel(session),
      value: getPracticeSessionMetricValue(session, selection),
    })),
  }
}

export const hasPlottableTimeline = (timeline: StatTimeline): boolean =>
  timeline.points.some((point) => point.value !== null)
