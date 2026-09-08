import { calculateDartPoints, createDartThrow } from '@open-darts/game/dartScoring'
import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import type { DartSegment, DartThrow } from '@open-darts/game/types/dart'
import { isRecord } from '../json'
import type { PublicDartThrow } from './types'

const isMultiplier = (value: string): value is DartMultiplier =>
  (Object.values(DartMultiplier) as string[]).includes(value)

const parseSegment = (value: Record<string, unknown>): DartSegment | null => {
  const segmentType = value.type

  if (segmentType === DartSegmentType.Number || segmentType === 'number') {
    if (typeof value.value !== 'number' || !Number.isInteger(value.value)) {
      return null
    }

    if (value.value < 1 || value.value > 20) {
      return null
    }

    return { type: DartSegmentType.Number, value: value.value }
  }

  if (segmentType === DartSegmentType.OuterBull || segmentType === 'outerBull') {
    return { type: DartSegmentType.OuterBull }
  }

  if (segmentType === DartSegmentType.Bull || segmentType === 'bull') {
    return { type: DartSegmentType.Bull }
  }

  return null
}

export const parsePublicDartThrow = (value: unknown): DartThrow | null => {
  if (!isRecord(value) || !isRecord(value.segment)) {
    return null
  }

  if (typeof value.multiplier !== 'string' || !isMultiplier(value.multiplier)) {
    return null
  }

  if (typeof value.timestamp !== 'string') {
    return null
  }

  const segment = parseSegment(value.segment)

  if (segment === null) {
    return null
  }

  // Always recompute points from segment + multiplier. Never trust client points.
  const dart = createDartThrow(segment, value.multiplier, value.timestamp)

  if (
    typeof value.points === 'number' &&
    value.points !== calculateDartPoints(segment, value.multiplier)
  ) {
    return null
  }

  return dart
}

export const parsePublicDartThrows = (value: unknown): DartThrow[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) {
    return null
  }

  const darts: DartThrow[] = []

  for (const entry of value) {
    const dart = parsePublicDartThrow(entry)

    if (dart === null) {
      return null
    }

    darts.push(dart)
  }

  return darts
}

export const toPublicDartThrow = (dart: DartThrow): PublicDartThrow => ({
  segment:
    dart.segment.type === DartSegmentType.Number
      ? { type: 'number', value: dart.segment.value }
      : dart.segment.type === DartSegmentType.OuterBull
        ? { type: 'outerBull' }
        : { type: 'bull' },
  multiplier: dart.multiplier,
  points: dart.points,
  timestamp: dart.timestamp,
})
