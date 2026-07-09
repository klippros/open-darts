import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'

const multiplierPrefix = (multiplier: DartThrow['multiplier']): string => {
  if (multiplier === DartMultiplier.Double) {
    return 'D'
  }

  if (multiplier === DartMultiplier.Triple) {
    return 'T'
  }

  return ''
}

export const formatDart = (dart: DartThrow): string => {
  if (dart.multiplier === DartMultiplier.Miss) {
    return 'Miss'
  }

  if (dart.segment.type === DartSegmentType.OuterBull) {
    return '25'
  }

  if (dart.segment.type === DartSegmentType.Bull) {
    return 'Bull'
  }

  return `${multiplierPrefix(dart.multiplier)}${dart.segment.value}`
}
