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

const recordMissAttempt = (attempts: AroundTheClockTargetAttempt[], targetIndex: number): void => {
  attempts.push({
    targetIndex,
    label: getAroundTheClockTargetLabel(targetIndex),
    dartsToHit: null,
    hit: false,
  })
}

export const extractAroundTheClockTargetAttempts = (
  visits: Visit[],
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): AroundTheClockTargetAttempt[] => {
  const attempts: AroundTheClockTargetAttempt[] = []

  if (visits.length === 0) {
    return attempts
  }

  let dartsOnCurrentTarget = 0

  for (const visit of visits) {
    let currentTarget = visit.scoreBefore

    for (const dart of visit.darts) {
      if (currentTarget >= AROUND_THE_CLOCK_TARGET_COUNT) {
        break
      }

      dartsOnCurrentTarget += 1

      if (!isAroundTheClockTargetHit(dart, currentTarget, aimMode)) {
        recordMissAttempt(attempts, currentTarget)
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
  }

  return attempts
}

export const getAroundTheClockCompletedTargets = (
  visits: Visit[],
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): AroundTheClockCompletedTarget[] =>
  extractAroundTheClockTargetAttempts(visits, aimMode).flatMap((attempt) =>
    attempt.hit && attempt.dartsToHit !== null
      ? [{ label: attempt.label, dartsToHit: attempt.dartsToHit }]
      : [],
  )
