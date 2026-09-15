import { DartMultiplier } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { NinetyNineDartsOutcome, NinetyNineDartsTargetKind } from '../types/ninetyNineDarts'
import type { NinetyNineDartsTarget } from '../types/ninetyNineDarts'
import {
  hitsBull,
  hitsDoubleOnNumber,
  hitsNumberSegment,
  hitsOuterBull,
  hitsSingleOnNumber,
  hitsTripleOnNumber,
} from '../segmentMatching'

export const NINETY_NINE_DARTS_DART_COUNT = 99
export const NINETY_NINE_DARTS_MAX_DARTS_PER_VISIT = 3

export const getNinetyNineDartsTargetLabel = (target: NinetyNineDartsTarget): string => {
  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    return 'Bull'
  }

  return String(target.value)
}

export const getNinetyNineDartsMaxScore = (target: NinetyNineDartsTarget): number => {
  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    return NINETY_NINE_DARTS_DART_COUNT * 2
  }

  return NINETY_NINE_DARTS_DART_COUNT * 3
}

export const getNinetyNineDartsOutcome = (
  dart: DartThrow,
  target: NinetyNineDartsTarget,
): NinetyNineDartsOutcome => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return NinetyNineDartsOutcome.Miss
  }

  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    if (hitsBull(dart)) {
      return NinetyNineDartsOutcome.Double
    }

    if (hitsOuterBull(dart)) {
      return NinetyNineDartsOutcome.Single
    }

    return NinetyNineDartsOutcome.Miss
  }

  if (!hitsNumberSegment(dart, target.value)) {
    return NinetyNineDartsOutcome.Miss
  }

  if (hitsSingleOnNumber(dart, target.value)) {
    return NinetyNineDartsOutcome.Single
  }

  if (hitsDoubleOnNumber(dart, target.value)) {
    return NinetyNineDartsOutcome.Double
  }

  if (hitsTripleOnNumber(dart, target.value)) {
    return NinetyNineDartsOutcome.Triple
  }

  return NinetyNineDartsOutcome.Miss
}

export const getNinetyNineDartsDartPoints = (
  dart: DartThrow,
  target: NinetyNineDartsTarget,
): number => {
  const outcome = getNinetyNineDartsOutcome(dart, target)

  switch (outcome) {
    case NinetyNineDartsOutcome.Miss:
      return 0
    case NinetyNineDartsOutcome.Single:
      return 1
    case NinetyNineDartsOutcome.Double:
      return 2
    case NinetyNineDartsOutcome.Triple:
      return 3
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}

export const isNinetyNineDartsTargetHit = (
  dart: DartThrow,
  target: NinetyNineDartsTarget,
): boolean => getNinetyNineDartsOutcome(dart, target) !== NinetyNineDartsOutcome.Miss

export const getNinetyNineDartsVisitScore = (
  darts: DartThrow[],
  target: NinetyNineDartsTarget,
): number => darts.reduce((total, dart) => total + getNinetyNineDartsDartPoints(dart, target), 0)

export interface NinetyNineDartsVisitOutcome {
  scoreAfter: number
  dartsThrownAfter: number
  visitScore: number
  checkout: boolean
}

export const resolveNinetyNineDartsVisit = (
  scoreBefore: number,
  dartsThrownBefore: number,
  darts: DartThrow[],
  target: NinetyNineDartsTarget,
): NinetyNineDartsVisitOutcome => {
  const visitScore = getNinetyNineDartsVisitScore(darts, target)
  const dartsThrownAfter = dartsThrownBefore + darts.length
  const scoreAfter = scoreBefore + visitScore
  const checkout = dartsThrownAfter >= NINETY_NINE_DARTS_DART_COUNT

  return {
    scoreAfter,
    dartsThrownAfter,
    visitScore,
    checkout,
  }
}

export const isNinetyNineDartsTripleAllowed = (target: NinetyNineDartsTarget): boolean =>
  target.kind === NinetyNineDartsTargetKind.Number

/** Outcomes available for the picker, bottom → top (Miss nearest the floor). */
export const getNinetyNineDartsPickerOutcomes = (
  target: NinetyNineDartsTarget,
): NinetyNineDartsOutcome[] => {
  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    return [
      NinetyNineDartsOutcome.Miss,
      NinetyNineDartsOutcome.Single,
      NinetyNineDartsOutcome.Double,
    ]
  }

  return [
    NinetyNineDartsOutcome.Miss,
    NinetyNineDartsOutcome.Single,
    NinetyNineDartsOutcome.Triple,
    NinetyNineDartsOutcome.Double,
  ]
}
