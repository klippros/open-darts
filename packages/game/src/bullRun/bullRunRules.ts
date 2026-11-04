import { DartMultiplier } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { BullRunOutcome } from '../types/bullRun'
import { hitsBull, hitsOuterBull } from '../segmentMatching'

export const BULL_RUN_MAX_DARTS_PER_VISIT = 3
export const BULL_RUN_TARGET_SCORE_MIN = 5
export const BULL_RUN_TARGET_SCORE_MAX = 50
export const BULL_RUN_DEFAULT_TARGET_SCORE = 15

export const getBullRunOutcome = (dart: DartThrow): BullRunOutcome => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return BullRunOutcome.Miss
  }

  if (hitsBull(dart)) {
    return BullRunOutcome.Double
  }

  if (hitsOuterBull(dart)) {
    return BullRunOutcome.Single
  }

  return BullRunOutcome.Miss
}

export const getBullRunDartPoints = (dart: DartThrow): number => {
  const outcome = getBullRunOutcome(dart)

  switch (outcome) {
    case BullRunOutcome.Miss:
      return 0
    case BullRunOutcome.Single:
      return 1
    case BullRunOutcome.Double:
      return 2
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}

export const getBullRunVisitScore = (darts: DartThrow[]): number =>
  darts.reduce((total, dart) => total + getBullRunDartPoints(dart), 0)

export interface BullRunVisitOutcome {
  scoreAfter: number
  dartsThrownAfter: number
  visitScore: number
  checkout: boolean
}

export const resolveBullRunVisit = (
  scoreBefore: number,
  dartsThrownBefore: number,
  darts: DartThrow[],
  targetScore: number,
): BullRunVisitOutcome => {
  const visitScore = getBullRunVisitScore(darts)
  const dartsThrownAfter = dartsThrownBefore + darts.length
  const scoreAfter = scoreBefore + visitScore
  const checkout = scoreAfter >= targetScore

  return {
    scoreAfter,
    dartsThrownAfter,
    visitScore,
    checkout,
  }
}

/** Outcomes available for the picker, bottom → top (Miss nearest the floor). */
export const getBullRunPickerOutcomes = (): BullRunOutcome[] => [
  BullRunOutcome.Miss,
  BullRunOutcome.Single,
  BullRunOutcome.Double,
]
