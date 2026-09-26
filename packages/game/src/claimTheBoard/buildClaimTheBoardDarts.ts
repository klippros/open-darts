import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { AroundTheClockAimMode } from '../types/aroundTheClock'
import { createDartThrow } from '../dartScoring'
import { isAroundTheClockBullTarget } from '../aroundTheClock/aroundTheClockRules'
import { CLAIM_THE_BOARD_MAX_DARTS_PER_VISIT } from './claimTheBoardRules'

export type ClaimTheBoardHitCount = 0 | 1 | 2 | 3

const createMissDart = (): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss)

export const createClaimTheBoardHitDart = (
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): DartThrow => {
  if (isAroundTheClockBullTarget(targetIndex)) {
    switch (aimMode) {
      case AroundTheClockAimMode.Any:
      case AroundTheClockAimMode.Singles:
        return createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single)
      case AroundTheClockAimMode.Doubles:
      case AroundTheClockAimMode.Trebles:
        return createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single)
      default: {
        throw new Error(`Unhandled aim mode: ${String(aimMode)}`)
      }
    }
  }

  const value = targetIndex + 1

  switch (aimMode) {
    case AroundTheClockAimMode.Any:
    case AroundTheClockAimMode.Singles:
      return createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Single)
    case AroundTheClockAimMode.Doubles:
      return createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Double)
    case AroundTheClockAimMode.Trebles:
      return createDartThrow({ type: DartSegmentType.Number, value }, DartMultiplier.Triple)
    default: {
      throw new Error(`Unhandled aim mode: ${String(aimMode)}`)
    }
  }
}

export const buildClaimTheBoardDartsForHitCount = (
  hitCount: ClaimTheBoardHitCount,
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): DartThrow[] => {
  const hits = Array.from({ length: hitCount }, () =>
    createClaimTheBoardHitDart(targetIndex, aimMode),
  )
  const misses = Array.from({ length: CLAIM_THE_BOARD_MAX_DARTS_PER_VISIT - hitCount }, () =>
    createMissDart(),
  )

  return [...hits, ...misses]
}
