import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartSegment, DartThrow } from '../types/dart'

export const isDoubleDart = (dart: DartThrow): boolean => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return false
  }

  if (dart.segment.type === DartSegmentType.Bull) {
    return true
  }

  return dart.multiplier === DartMultiplier.Double
}

export const calculateDartPoints = (segment: DartSegment, multiplier: DartMultiplier): number => {
  if (multiplier === DartMultiplier.Miss) {
    return 0
  }

  if (segment.type === DartSegmentType.OuterBull) {
    if (multiplier === DartMultiplier.Single) {
      return 25
    }

    if (multiplier === DartMultiplier.Double) {
      return 50
    }

    return 0
  }

  if (segment.type === DartSegmentType.Bull) {
    if (multiplier === DartMultiplier.Single) {
      return 50
    }

    return 0
  }

  const { value } = segment

  if (value < 1 || value > 20) {
    return 0
  }

  if (multiplier === DartMultiplier.Single) {
    return value
  }

  if (multiplier === DartMultiplier.Double) {
    return value * 2
  }

  return value * 3
}

export const createDartThrow = (
  segment: DartSegment,
  multiplier: DartMultiplier,
  timestamp = new Date().toISOString(),
): DartThrow => ({
  segment,
  multiplier,
  points: calculateDartPoints(segment, multiplier),
  timestamp,
})

export const sumDartPoints = (darts: DartThrow[]): number =>
  darts.reduce((total, dart) => total + dart.points, 0)
