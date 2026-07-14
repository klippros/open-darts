import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import type { Visit } from '../../types/visit'
import {
  AROUND_THE_CLOCK_TARGET_COUNT,
  getAroundTheClockTargetLabel,
  isAroundTheClockTargetHit,
} from './aroundTheClockRules'

export interface AroundTheClockTargetAttempt {
  targetIndex: number
  label: string
  dartsToHit: number | null
  hit: boolean
}

export interface AroundTheClockCompletedTarget {
  label: string
  dartsToHit: number
}

const recordFailedAttempt = (
  attempts: AroundTheClockTargetAttempt[],
  targetIndex: number,
): void => {
  attempts.push({
    targetIndex,
    label: getAroundTheClockTargetLabel(targetIndex),
    dartsToHit: null,
    hit: false,
  })
}

const extractAttemptsFromVisit = (
  visit: Visit,
  aimMode: AroundTheClockAimMode,
): AroundTheClockTargetAttempt[] => {
  const attempts: AroundTheClockTargetAttempt[] = []
  let currentTarget = visit.scoreBefore
  let dartsOnCurrentTarget = 0

  for (const dart of visit.darts) {
    dartsOnCurrentTarget += 1

    if (!isAroundTheClockTargetHit(dart, currentTarget, aimMode)) {
      continue
    }

    attempts.push({
      targetIndex: currentTarget,
      label: getAroundTheClockTargetLabel(currentTarget),
      dartsToHit: dartsOnCurrentTarget,
      hit: true,
    })

    currentTarget += 1
    dartsOnCurrentTarget = 0

    if (currentTarget >= AROUND_THE_CLOCK_TARGET_COUNT) {
      break
    }
  }

  if (dartsOnCurrentTarget > 0) {
    recordFailedAttempt(attempts, currentTarget)
  }

  return attempts
}

export const extractAroundTheClockTargetAttempts = (
  visits: Visit[],
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): AroundTheClockTargetAttempt[] =>
  visits.flatMap((visit) => extractAttemptsFromVisit(visit, aimMode))

export const getAroundTheClockCompletedTargets = (
  visits: Visit[],
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): AroundTheClockCompletedTarget[] =>
  extractAroundTheClockTargetAttempts(visits, aimMode).flatMap((attempt) =>
    attempt.hit && attempt.dartsToHit !== null
      ? [{ label: attempt.label, dartsToHit: attempt.dartsToHit }]
      : [],
  )
