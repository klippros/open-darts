import type { DartThrow } from '../../types/dart'
import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import {
  hitsBull,
  hitsDoubleOnNumber,
  hitsDoubleOnOuterBull,
  hitsNumberSegment,
  hitsOuterBull,
  hitsSingleOnInnerBull,
  hitsSingleOnNumber,
  hitsSingleOnOuterBull,
  hitsTripleOnNumber,
} from '../segmentMatching'

export const AROUND_THE_CLOCK_TARGET_COUNT = 21

export const isAroundTheClockBullTarget = (targetIndex: number): boolean => targetIndex >= 20

export const getAroundTheClockTargetLabel = (targetIndex: number): string => {
  if (targetIndex >= 20) {
    return 'Bull'
  }

  return String(targetIndex + 1)
}

const isAroundTheClockBullHit = (dart: DartThrow, aimMode: AroundTheClockAimMode): boolean => {
  switch (aimMode) {
    case AroundTheClockAimMode.Any:
      return hitsOuterBull(dart) || hitsBull(dart)
    case AroundTheClockAimMode.Singles:
      return hitsSingleOnOuterBull(dart) || hitsSingleOnInnerBull(dart)
    case AroundTheClockAimMode.Doubles:
      return hitsDoubleOnOuterBull(dart) || hitsBull(dart)
    case AroundTheClockAimMode.Trebles:
      return hitsBull(dart)
  }
}

const isAroundTheClockNumberHit = (
  dart: DartThrow,
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): boolean => {
  const value = targetIndex + 1

  switch (aimMode) {
    case AroundTheClockAimMode.Any:
      return hitsNumberSegment(dart, value)
    case AroundTheClockAimMode.Singles:
      return hitsSingleOnNumber(dart, value)
    case AroundTheClockAimMode.Doubles:
      return hitsDoubleOnNumber(dart, value)
    case AroundTheClockAimMode.Trebles:
      return hitsTripleOnNumber(dart, value)
  }
}

export const isAroundTheClockTargetHit = (
  dart: DartThrow,
  targetIndex: number,
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): boolean => {
  if (targetIndex >= 20) {
    return isAroundTheClockBullHit(dart, aimMode)
  }

  return isAroundTheClockNumberHit(dart, targetIndex, aimMode)
}

export interface AroundTheClockVisitOutcome {
  targetIndexAfter: number
  checkout: boolean
}

export const resolveAroundTheClockVisit = (
  targetIndex: number,
  darts: DartThrow[],
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): AroundTheClockVisitOutcome => {
  let currentTarget = targetIndex

  for (const dart of darts) {
    if (!isAroundTheClockTargetHit(dart, currentTarget, aimMode)) {
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
  aimMode: AroundTheClockAimMode = AroundTheClockAimMode.Any,
): number => {
  let currentTarget = targetIndex
  let visitScore = 0

  for (const dart of darts) {
    if (!isAroundTheClockTargetHit(dart, currentTarget, aimMode)) {
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
