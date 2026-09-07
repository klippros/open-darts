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

export const hitsSingleOnNumber = (dart: DartThrow, value: number): boolean =>
  dart.multiplier === DartMultiplier.Single &&
  dart.segment.type === DartSegmentType.Number &&
  dart.segment.value === value

export const hitsTripleOnNumber = (dart: DartThrow, value: number): boolean =>
  dart.multiplier === DartMultiplier.Triple &&
  dart.segment.type === DartSegmentType.Number &&
  dart.segment.value === value

export const hitsOuterBull = (dart: DartThrow): boolean =>
  dart.multiplier !== DartMultiplier.Miss && dart.segment.type === DartSegmentType.OuterBull

export const hitsSingleOnOuterBull = (dart: DartThrow): boolean =>
  dart.multiplier === DartMultiplier.Single && dart.segment.type === DartSegmentType.OuterBull

export const hitsDoubleOnOuterBull = (dart: DartThrow): boolean =>
  dart.multiplier === DartMultiplier.Double && dart.segment.type === DartSegmentType.OuterBull

export const hitsSingleOnInnerBull = (dart: DartThrow): boolean =>
  dart.multiplier === DartMultiplier.Single && dart.segment.type === DartSegmentType.Bull
