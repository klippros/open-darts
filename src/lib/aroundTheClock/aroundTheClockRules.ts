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

export const getAroundTheClockTargetAimLabel = (
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): string => {
  if (targetIndex >= AROUND_THE_CLOCK_TARGET_COUNT) {
    return 'Done'
  }

  if (isAroundTheClockBullTarget(targetIndex)) {
    const bullLabels: Record<AroundTheClockAimMode, string> = {
      [AroundTheClockAimMode.Any]: '25/Bull',
      [AroundTheClockAimMode.Singles]: '25/Bull',
      [AroundTheClockAimMode.Doubles]: 'Bull',
      [AroundTheClockAimMode.Trebles]: 'Bull',
    }

    return bullLabels[aimMode]
  }

  const value = String(targetIndex + 1)
  const numberLabels: Record<AroundTheClockAimMode, string> = {
    [AroundTheClockAimMode.Any]: value,
    [AroundTheClockAimMode.Singles]: `S${value}`,
    [AroundTheClockAimMode.Doubles]: `D${value}`,
    [AroundTheClockAimMode.Trebles]: `T${value}`,
  }

  return numberLabels[aimMode]
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
    default: {
      throw new Error(`Unhandled aim mode: ${String(aimMode)}`)
    }
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
    default: {
      throw new Error(`Unhandled aim mode: ${String(aimMode)}`)
    }
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
