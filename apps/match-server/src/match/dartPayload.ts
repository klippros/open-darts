import { DartMultiplier, DartSegmentType } from '@open-darts/game/types/dart'
import type { DartThrow } from '@open-darts/game/types/dart'
import { isRecord } from '../json'
import type { PublicDartThrow } from './types'

const isMultiplier = (value: string): value is DartMultiplier =>
  (Object.values(DartMultiplier) as string[]).includes(value)

export const parsePublicDartThrow = (value: unknown): DartThrow | null => {
  if (!isRecord(value) || !isRecord(value.segment)) {
    return null
  }

  if (
    typeof value.multiplier !== 'string' ||
    !isMultiplier(value.multiplier) ||
    typeof value.points !== 'number' ||
    typeof value.timestamp !== 'string'
  ) {
    return null
  }

  const segmentType = value.segment.type

  if (segmentType === DartSegmentType.Number || segmentType === 'number') {
    if (typeof value.segment.value !== 'number') {
      return null
    }

    return {
      segment: { type: DartSegmentType.Number, value: value.segment.value },
      multiplier: value.multiplier,
      points: value.points,
      timestamp: value.timestamp,
    }
  }

  if (segmentType === DartSegmentType.OuterBull || segmentType === 'outerBull') {
    return {
      segment: { type: DartSegmentType.OuterBull },
      multiplier: value.multiplier,
      points: value.points,
      timestamp: value.timestamp,
    }
  }

  if (segmentType === DartSegmentType.Bull || segmentType === 'bull') {
    return {
      segment: { type: DartSegmentType.Bull },
      multiplier: value.multiplier,
      points: value.points,
      timestamp: value.timestamp,
    }
  }

  return null
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
