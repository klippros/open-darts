import type { DartThrow } from '../types/dart.ts'
import { BullRunOutcome } from '../types/bullRun.ts'
import { NinetyNineDartsOutcome, NinetyNineDartsTargetKind } from '../types/ninetyNineDarts.ts'
import { getNinetyNineDartsOutcome } from '../ninetyNineDarts/ninetyNineDartsRules.ts'

export const BULL_RUN_MAX_DARTS_PER_VISIT = 3
export const BULL_RUN_TARGET_SCORE_MIN = 5
export const BULL_RUN_TARGET_SCORE_MAX = 50
export const BULL_RUN_DEFAULT_TARGET_SCORE = 15

const BULL_RUN_TARGET = { kind: NinetyNineDartsTargetKind.Bull } as const

export const getBullRunOutcome = (dart: DartThrow): BullRunOutcome => {
  const outcome = getNinetyNineDartsOutcome(dart, BULL_RUN_TARGET)

  switch (outcome) {
    case NinetyNineDartsOutcome.Miss:
      return BullRunOutcome.Miss
    case NinetyNineDartsOutcome.Single:
      return BullRunOutcome.Single
    case NinetyNineDartsOutcome.Double:
      return BullRunOutcome.Double
    case NinetyNineDartsOutcome.Triple:
      return BullRunOutcome.Miss
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
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
