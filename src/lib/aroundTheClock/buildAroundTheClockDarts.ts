import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'
import type { VisitDartSlotView } from '../checkout/checkoutSuggestions'
import { createDartThrow } from '../dartScoring'
import { formatDart } from '../formatDart'
import { resolveAroundTheClockVisit } from './aroundTheClockRules'

export const AROUND_THE_CLOCK_MAX_DARTS_PER_VISIT = 3

export type AroundTheClockDartOrdinal = 1 | 2 | 3

const SLOT_COUNT = 3

const createMissDart = (): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss)

export const getAroundTheClockDartsLeft = (
  pendingDarts: DartThrow[],
  maxDartsPerVisit = AROUND_THE_CLOCK_MAX_DARTS_PER_VISIT,
): number => Math.max(0, maxDartsPerVisit - pendingDarts.length)

export const getAroundTheClockCurrentTargetIndex = (
  committedTargetIndex: number,
  pendingDarts: DartThrow[],
  aimMode: AroundTheClockAimMode,
): number =>
  resolveAroundTheClockVisit(committedTargetIndex, pendingDarts, aimMode).targetIndexAfter

export const createHitDartForTarget = (
  targetIndex: number,
  aimMode: AroundTheClockAimMode,
): DartThrow => {
  if (targetIndex >= 20) {
    switch (aimMode) {
      case AroundTheClockAimMode.Any:
      case AroundTheClockAimMode.Singles:
        return createDartThrow({ type: DartSegmentType.OuterBull }, DartMultiplier.Single)
      case AroundTheClockAimMode.Doubles:
      case AroundTheClockAimMode.Trebles:
        return createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single)
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
  }
}

export const buildDartsForOrdinalHit = (
  ordinal: AroundTheClockDartOrdinal,
  committedTargetIndex: number,
  pendingDarts: DartThrow[],
  aimMode: AroundTheClockAimMode,
): DartThrow[] => {
  const dartsToAdd = ordinal - pendingDarts.length

  if (dartsToAdd <= 0) {
    return []
  }

  const targetIndex = getAroundTheClockCurrentTargetIndex(
    committedTargetIndex,
    pendingDarts,
    aimMode,
  )

  return [
    ...Array.from({ length: dartsToAdd - 1 }, () => createMissDart()),
    createHitDartForTarget(targetIndex, aimMode),
  ]
}

export const buildDartsForMissAll = (count: number): DartThrow[] =>
  Array.from({ length: count }, () => createMissDart())

export const getAroundTheClockAvailableOrdinals = (
  pendingDarts: DartThrow[],
  maxDartsPerVisit = AROUND_THE_CLOCK_MAX_DARTS_PER_VISIT,
): AroundTheClockDartOrdinal[] => {
  const dartsLeft = getAroundTheClockDartsLeft(pendingDarts, maxDartsPerVisit)
  const ordinals: AroundTheClockDartOrdinal[] = []

  for (let ordinal = pendingDarts.length + 1; ordinal <= maxDartsPerVisit; ordinal += 1) {
    if (ordinal - pendingDarts.length <= dartsLeft) {
      ordinals.push(ordinal as AroundTheClockDartOrdinal)
    }
  }

  return ordinals
}

export const getAroundTheClockThrownSlotLabel = (
  _committedTargetIndex: number,
  pendingDarts: DartThrow[],
  _aimMode: AroundTheClockAimMode,
  slotIndex: number,
): string => {
  const dart = pendingDarts[slotIndex]

  if (dart === undefined) {
    return '—'
  }

  return formatDart(dart)
}

export const getAroundTheClockVisitDartSlots = (
  committedTargetIndex: number,
  pendingDarts: DartThrow[],
  aimMode: AroundTheClockAimMode,
): VisitDartSlotView[] =>
  Array.from({ length: SLOT_COUNT }, (_, index) => {
    const dart = pendingDarts[index]

    if (dart === undefined) {
      return { kind: 'empty', label: null }
    }

    return {
      kind: 'thrown',
      label: getAroundTheClockThrownSlotLabel(committedTargetIndex, pendingDarts, aimMode, index),
    }
  })
