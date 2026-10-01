import { DartMultiplier } from '../types/dart'
import type { DartThrow } from '../types/dart'
import { HunterOutcome } from '../types/hunter'
import {
  hitsDoubleOnNumber,
  hitsNumberSegment,
  hitsSingleOnNumber,
  hitsTripleOnNumber,
} from '../segmentMatching'
import {
  advanceHunterFieldIndex,
  doesHunterAdvanceCatch,
  getHunterFieldNumber,
} from './hunterClock'

export const HUNTER_MAX_DARTS_PER_VISIT = 3

export const getHunterAdvanceForOutcome = (outcome: HunterOutcome): number => {
  switch (outcome) {
    case HunterOutcome.Miss:
      return 0
    case HunterOutcome.Single:
      return 1
    case HunterOutcome.Double:
      return 2
    case HunterOutcome.Triple:
      return 3
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled hunter outcome: ${String(exhaustive)}`)
    }
  }
}

export const getHunterOutcome = (dart: DartThrow, fieldNumber: number): HunterOutcome => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return HunterOutcome.Miss
  }

  if (!hitsNumberSegment(dart, fieldNumber)) {
    return HunterOutcome.Miss
  }

  if (hitsSingleOnNumber(dart, fieldNumber)) {
    return HunterOutcome.Single
  }

  if (hitsDoubleOnNumber(dart, fieldNumber)) {
    return HunterOutcome.Double
  }

  if (hitsTripleOnNumber(dart, fieldNumber)) {
    return HunterOutcome.Triple
  }

  return HunterOutcome.Miss
}

export const getHunterAdvanceForDart = (dart: DartThrow, fieldNumber: number): number =>
  getHunterAdvanceForOutcome(getHunterOutcome(dart, fieldNumber))

export const isHunterTargetHit = (dart: DartThrow, fieldNumber: number): boolean =>
  getHunterOutcome(dart, fieldNumber) !== HunterOutcome.Miss

/** Outcomes for the picker, bottom → top (Miss nearest the floor). */
export const getHunterPickerOutcomes = (): HunterOutcome[] => [
  HunterOutcome.Miss,
  HunterOutcome.Single,
  HunterOutcome.Triple,
  HunterOutcome.Double,
]

export interface HunterDartResolution {
  fieldIndexAfter: number
  advances: number
  caught: boolean
}

export const resolveHunterDart = (
  fieldIndex: number,
  opponentFieldIndex: number,
  dart: DartThrow,
): HunterDartResolution => {
  const fieldNumber = getHunterFieldNumber(fieldIndex)
  const advances = getHunterAdvanceForDart(dart, fieldNumber)
  const caught = doesHunterAdvanceCatch(fieldIndex, opponentFieldIndex, advances)
  const fieldIndexAfter = advanceHunterFieldIndex(fieldIndex, advances)

  return {
    fieldIndexAfter,
    advances,
    caught,
  }
}

export interface HunterVisitOutcome {
  fieldIndexAfter: number
  advances: number
  visitScore: number
  checkout: boolean
}

export const resolveHunterVisit = (
  fieldIndex: number,
  opponentFieldIndex: number,
  darts: DartThrow[],
): HunterVisitOutcome => {
  let currentIndex = fieldIndex
  let totalAdvances = 0

  for (const dart of darts) {
    const resolution = resolveHunterDart(currentIndex, opponentFieldIndex, dart)
    currentIndex = resolution.fieldIndexAfter
    totalAdvances += resolution.advances

    if (resolution.caught) {
      return {
        fieldIndexAfter: currentIndex,
        advances: totalAdvances,
        visitScore: totalAdvances,
        checkout: true,
      }
    }
  }

  return {
    fieldIndexAfter: currentIndex,
    advances: totalAdvances,
    visitScore: totalAdvances,
    checkout: false,
  }
}
