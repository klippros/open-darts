import { DartMultiplier, DartSegmentType } from '../types/dart'
import type { DartThrow } from '../types/dart'

export const hitsNumberSegment = (dart: DartThrow, value: number): boolean =>
  dart.multiplier !== DartMultiplier.Miss &&
  dart.segment.type === DartSegmentType.Number &&
  dart.segment.value === value

export const hitsDoubleOnNumber = (dart: DartThrow, value: number): boolean =>
  dart.multiplier === DartMultiplier.Double &&
  dart.segment.type === DartSegmentType.Number &&
  dart.segment.value === value

export const hitsBull = (dart: DartThrow): boolean =>
  dart.multiplier !== DartMultiplier.Miss && dart.segment.type === DartSegmentType.Bull
