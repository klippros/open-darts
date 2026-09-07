export enum DartSegmentType {
  Number = 'number',
  OuterBull = 'outerBull',
  Bull = 'bull',
}

export enum DartMultiplier {
  Single = 'single',
  Double = 'double',
  Triple = 'triple',
  Miss = 'miss',
}

export type DartSegment =
  | { type: DartSegmentType.Number; value: number }
  | { type: DartSegmentType.OuterBull }
  | { type: DartSegmentType.Bull }

export interface DartThrow {
  segment: DartSegment
  multiplier: DartMultiplier
  points: number
  timestamp: string
}
