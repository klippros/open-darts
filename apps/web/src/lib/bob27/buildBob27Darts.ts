import { DartMultiplier, DartSegmentType } from '../../types/dart'
import type { DartThrow } from '../../types/dart'
import { createDartThrow } from '../dartScoring'
import { BOB27_MAX_DARTS_PER_VISIT } from './bob27Rules'

export type Bob27HitCount = 0 | 1 | 2 | 3

const createMissDart = (): DartThrow =>
  createDartThrow({ type: DartSegmentType.Number, value: 20 }, DartMultiplier.Miss)

export const createBob27HitDart = (targetIndex: number): DartThrow => {
  if (targetIndex >= 20) {
    return createDartThrow({ type: DartSegmentType.Bull }, DartMultiplier.Single)
  }

  return createDartThrow(
    { type: DartSegmentType.Number, value: targetIndex + 1 },
    DartMultiplier.Double,
  )
}

export const buildBob27DartsForHitCount = (
  hitCount: Bob27HitCount,
  targetIndex: number,
): DartThrow[] => {
  const hits = Array.from({ length: hitCount }, () => createBob27HitDart(targetIndex))
  const misses = Array.from({ length: BOB27_MAX_DARTS_PER_VISIT - hitCount }, () =>
    createMissDart(),
  )

  return [...hits, ...misses]
}
