import type { DartThrow } from '../../types/dart'
import { hitsBull, hitsNumberSegment } from '../segmentMatching'

export const AROUND_THE_CLOCK_TARGET_COUNT = 21

export const getAroundTheClockTargetLabel = (targetIndex: number): string => {
  if (targetIndex >= 20) {
    return 'Bull'
  }

  return String(targetIndex + 1)
}

export const isAroundTheClockTargetHit = (dart: DartThrow, targetIndex: number): boolean => {
  if (targetIndex >= 20) {
    return hitsBull(dart)
  }

  return hitsNumberSegment(dart, targetIndex + 1)
}

export interface AroundTheClockVisitOutcome {
  targetIndexAfter: number
  checkout: boolean
}

export const resolveAroundTheClockVisit = (
  targetIndex: number,
  darts: DartThrow[],
): AroundTheClockVisitOutcome => {
  let currentTarget = targetIndex

  for (const dart of darts) {
    if (!isAroundTheClockTargetHit(dart, currentTarget)) {
      continue
    }

    currentTarget += 1

    if (currentTarget >= AROUND_THE_CLOCK_TARGET_COUNT) {
      return {
        targetIndexAfter: currentTarget,
        checkout: true,
      }
    }
  }

  return {
    targetIndexAfter: currentTarget,
    checkout: false,
  }
}

export const getAroundTheClockVisitScore = (
  targetIndex: number,
  darts: DartThrow[],
): number => {
  let currentTarget = targetIndex
  let visitScore = 0

  for (const dart of darts) {
    if (!isAroundTheClockTargetHit(dart, currentTarget)) {
      continue
    }

    visitScore += dart.points
    currentTarget += 1

    if (currentTarget >= AROUND_THE_CLOCK_TARGET_COUNT) {
      break
    }
  }

  return visitScore
}
