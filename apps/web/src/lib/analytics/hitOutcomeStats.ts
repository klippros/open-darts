import type { DartThrow } from '@open-darts/game/types/dart'
import { isCountingVisit } from '@open-darts/game/types/visit'
import type { Visit } from '@open-darts/game/types/visit'

export interface BaseHitOutcomeCounts {
  singles: number
  doubles: number
  misses: number
}

export interface HitOutcomeCounts extends BaseHitOutcomeCounts {
  trebles: number
}

export const emptyBaseHitCounts = (): BaseHitOutcomeCounts => ({
  singles: 0,
  doubles: 0,
  misses: 0,
})

export const emptyHitCounts = (): HitOutcomeCounts => ({
  ...emptyBaseHitCounts(),
  trebles: 0,
})

export const mergeBaseHitOutcomeCounts = (
  left: BaseHitOutcomeCounts,
  right: BaseHitOutcomeCounts,
): BaseHitOutcomeCounts => ({
  singles: left.singles + right.singles,
  doubles: left.doubles + right.doubles,
  misses: left.misses + right.misses,
})

export const mergeHitOutcomeCounts = (
  left: HitOutcomeCounts,
  right: HitOutcomeCounts,
): HitOutcomeCounts => ({
  ...mergeBaseHitOutcomeCounts(left, right),
  trebles: left.trebles + right.trebles,
})

export const getHitCount = (counts: BaseHitOutcomeCounts & { trebles?: number }): number =>
  counts.singles + counts.doubles + (counts.trebles ?? 0)

export const getHitRateFromCounts = (
  counts: BaseHitOutcomeCounts & { trebles?: number },
): number | null => {
  const hits = getHitCount(counts)
  const dartsThrown = hits + counts.misses

  if (dartsThrown === 0) {
    return null
  }

  return (hits / dartsThrown) * 100
}

/** Normalize a per-dart rate to a three-dart average. */
export const ratePerThreeDarts = (count: number, dartsThrown: number): number | null => {
  if (dartsThrown === 0) {
    return null
  }

  return (count / dartsThrown) * 3
}

export const formatThreeDartRate = (value: number | null): string =>
  value === null ? '—' : value.toFixed(2)

export const collectPlayerDarts = (
  visits: Visit[],
  playerId: string,
  pendingDarts: DartThrow[] = [],
  includePending = true,
): DartThrow[] => {
  const committedDarts = visits
    .filter((visit) => visit.playerId === playerId && isCountingVisit(visit))
    .flatMap((visit) => visit.darts)

  return includePending ? [...committedDarts, ...pendingDarts] : committedDarts
}
