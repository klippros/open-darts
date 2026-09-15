import { DartSegmentType } from '@open-darts/game/types/dart'
import type { DartThrow } from '@open-darts/game/types/dart'
import type { PublicDartThrow } from './types'

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
