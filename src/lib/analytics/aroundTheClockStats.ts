import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import type { GameSession } from '../../types/gameSession'
import { GameModeId } from '../../types/gameMode'
import { getAroundTheClockConfig } from '../aroundTheClock/aroundTheClockConfig'
import {
  AROUND_THE_CLOCK_TARGET_COUNT,
  getAroundTheClockTargetLabel,
} from '../aroundTheClock/aroundTheClockRules'
import type { AroundTheClockTargetAttempt } from '../aroundTheClock/aroundTheClockTargetHits'
import {
  extractAroundTheClockTargetAttempts,
  getAroundTheClockCompletedTargets,
} from '../aroundTheClock/aroundTheClockTargetHits'
import { countDartsInSession, getPrimaryPlayerVisits } from './visitStats'

export interface AroundTheClockSingleSessionStats {
  dartsThrown: number
  fieldsCompleted: number
  totalFields: number
  avgDartsPerField: number | null
  isComplete: boolean
  currentTargetLabel: string | null
}

export interface AroundTheClockPerTargetStats {
  targetIndex: number
  label: string
  attemptCount: number
  hitCount: number
  avgDartsPerHit: number | null
  bestDarts: number | null
}

export interface AroundTheClockSessionStats {
  completionRate: number | null
  avgDartsFullRun: number | null
  bestDartsFullRun: number | null
  avgDartsPerField: number | null
  bestDartsPerField: number | null
  targets: AroundTheClockPerTargetStats[]
}

export const computeAroundTheClockSingleSessionStats = (
  session: GameSession,
): AroundTheClockSingleSessionStats | null => {
  if (session.mode !== GameModeId.AroundTheClock) {
    return null
  }

  const { aimMode } = getAroundTheClockConfig(session.config)
  const visits = getPrimaryPlayerVisits(session)
  const dartsThrown = countDartsInSession(session)
  const fieldsCompleted = getAroundTheClockCompletedTargets(visits, aimMode).length
  const lastVisit = visits.at(-1)
  const isComplete = session.finishedEarly !== true && lastVisit?.checkout === true

  const avgDartsPerField = fieldsCompleted === 0 ? null : dartsThrown / fieldsCompleted

  return {
    dartsThrown,
    fieldsCompleted,
    totalFields: AROUND_THE_CLOCK_TARGET_COUNT,
    avgDartsPerField,
    isComplete,
    currentTargetLabel:
      isComplete || lastVisit === undefined
        ? null
        : getAroundTheClockTargetLabel(lastVisit.scoreAfter),
  }
}

const getSessionAvgDartsPerFieldValues = (sessions: GameSession[]): number[] =>
  sessions
    .map((session) => computeAroundTheClockSingleSessionStats(session)?.avgDartsPerField)
    .filter((value): value is number => value !== null && value !== undefined)

const getMeanSessionAvgDartsPerField = (sessions: GameSession[]): number | null => {
  const values = getSessionAvgDartsPerFieldValues(sessions)

  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const getBestSessionAvgDartsPerField = (sessions: GameSession[]): number | null => {
  const values = getSessionAvgDartsPerFieldValues(sessions)

  if (values.length === 0) {
    return null
  }

  return Math.min(...values)
}

const createEmptyTargetStats = (): AroundTheClockPerTargetStats[] =>
  Array.from({ length: 21 }, (_, targetIndex) => ({
    targetIndex,
    label: getAroundTheClockTargetLabel(targetIndex),
    attemptCount: 0,
    hitCount: 0,
    avgDartsPerHit: null,
    bestDarts: null,
  }))

export const aggregatePerTargetStats = (
  attempts: AroundTheClockTargetAttempt[],
): AroundTheClockPerTargetStats[] => {
  const targets = createEmptyTargetStats()

  for (const attempt of attempts) {
    const target = targets[attempt.targetIndex]

    if (target === undefined) {
      continue
    }

    target.attemptCount += 1

    if (!attempt.hit || attempt.dartsToHit === null) {
      continue
    }

    target.hitCount += 1

    if (target.bestDarts === null || attempt.dartsToHit < target.bestDarts) {
      target.bestDarts = attempt.dartsToHit
    }
  }

  return targets.map((target) => {
    const hits = attempts.filter(
      (attempt) =>
        attempt.targetIndex === target.targetIndex && attempt.hit && attempt.dartsToHit !== null,
    )

    if (hits.length === 0) {
      return target
    }

    const totalDarts = hits.reduce((sum, attempt) => sum + (attempt.dartsToHit ?? 0), 0)

    return {
      ...target,
      avgDartsPerHit: totalDarts / hits.length,
    }
  })
}

export const aggregateAroundTheClockSessionStats = (
  sessions: GameSession[],
  aimMode: AroundTheClockAimMode,
): AroundTheClockSessionStats => {
  const modeSessions = sessions.filter((session) => {
    if (session.mode !== GameModeId.AroundTheClock) {
      return false
    }

    return getAroundTheClockConfig(session.config).aimMode === aimMode
  })

  const attempts = modeSessions.flatMap((session) =>
    extractAroundTheClockTargetAttempts(getPrimaryPlayerVisits(session), aimMode),
  )
  const completedSessions = modeSessions.filter((session) => session.finishedEarly !== true)
  const dartCounts = completedSessions.map((session) => countDartsInSession(session))

  return {
    completionRate:
      modeSessions.length === 0 ? null : (completedSessions.length / modeSessions.length) * 100,
    avgDartsFullRun:
      dartCounts.length === 0
        ? null
        : dartCounts.reduce((sum, count) => sum + count, 0) / dartCounts.length,
    bestDartsFullRun: dartCounts.length === 0 ? null : Math.min(...dartCounts),
    avgDartsPerField: getMeanSessionAvgDartsPerField(modeSessions),
    bestDartsPerField: getBestSessionAvgDartsPerField(modeSessions),
    targets: aggregatePerTargetStats(attempts),
  }
}
