import type { DartThrow } from '@open-darts/game/types/dart.ts'
import { GameModeId } from '@open-darts/game/types/gameMode.ts'
import type { GameSession } from '@open-darts/game/types/gameSession.ts'
import { BullRunOutcome } from '@open-darts/game/types/bullRun.ts'
import type { Visit } from '@open-darts/game/types/visit.ts'
import { isBullRunConfig } from '@open-darts/game/game/gameConfigGuards.ts'
import { getBullRunConfig } from '@open-darts/game/bullRun/bullRunConfig.ts'
import { getBullRunDartPoints, getBullRunOutcome } from '@open-darts/game/bullRun/bullRunRules.ts'
import type { ScoreMetric } from './scoreMetric.ts'
import {
  collectPlayerDarts,
  emptyBaseHitCounts,
  formatThreeDartRate,
  getHitCount,
  getHitRateFromCounts,
  mergeBaseHitOutcomeCounts,
  ratePerThreeDarts,
} from './hitOutcomeStats.ts'
import type { BaseHitOutcomeCounts } from './hitOutcomeStats.ts'
import { getPlayerVisits, getPrimaryPlayerVisits } from './visitStats.ts'

export type BullRunOutcomeCounts = BaseHitOutcomeCounts

export interface BullRunLiveStats {
  score: number
  dartsThrown: number
  hitRate: number | null
  avgPerThreeDarts: number | null
  singlesPerThreeDarts: number | null
  doublesPerThreeDarts: number | null
  counts: BullRunOutcomeCounts
}

export interface BullRunSingleSessionStats {
  score: number | null
  targetScore: number
  hitRate: number | null
  avgPerThreeDarts: number | null
  singlesPerThreeDarts: number | null
  doublesPerThreeDarts: number | null
  counts: BullRunOutcomeCounts
  dartsThrown: number
  visitCount: number
}

export const accumulateBullRunOutcome = (
  counts: BullRunOutcomeCounts,
  outcome: BullRunOutcome,
): BullRunOutcomeCounts => {
  switch (outcome) {
    case BullRunOutcome.Miss:
      return { ...counts, misses: counts.misses + 1 }
    case BullRunOutcome.Single:
      return { ...counts, singles: counts.singles + 1 }
    case BullRunOutcome.Double:
      return { ...counts, doubles: counts.doubles + 1 }
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}

export const countBullRunOutcomes = (darts: DartThrow[]): BullRunOutcomeCounts =>
  darts.reduce(
    (counts, dart) => accumulateBullRunOutcome(counts, getBullRunOutcome(dart)),
    emptyBaseHitCounts(),
  )

export const mergeBullRunOutcomeCounts = mergeBaseHitOutcomeCounts

export const getBullRunHitCount = getHitCount

export const getBullRunHitRateFromCounts = getHitRateFromCounts

export { ratePerThreeDarts }

export const getBullRunLiveStats = (
  visits: Visit[],
  playerId: string,
  pendingDarts: DartThrow[] = [],
  includePending = true,
): BullRunLiveStats => {
  const allDarts = collectPlayerDarts(visits, playerId, pendingDarts, includePending)
  const counts = countBullRunOutcomes(allDarts)
  const score = allDarts.reduce((total, dart) => total + getBullRunDartPoints(dart), 0)

  return {
    score,
    dartsThrown: allDarts.length,
    hitRate: getBullRunHitRateFromCounts(counts),
    avgPerThreeDarts: ratePerThreeDarts(score, allDarts.length),
    singlesPerThreeDarts: ratePerThreeDarts(counts.singles, allDarts.length),
    doublesPerThreeDarts: ratePerThreeDarts(counts.doubles, allDarts.length),
    counts,
  }
}

export const getBullRunLiveScoreMetrics = (stats: BullRunLiveStats): ScoreMetric[] => [
  { label: 'Singles', value: formatThreeDartRate(stats.singlesPerThreeDarts) },
  { label: 'Doubles', value: formatThreeDartRate(stats.doublesPerThreeDarts) },
  {
    label: 'Hit %',
    value: stats.hitRate === null ? '—' : String(Math.round(stats.hitRate)),
  },
  { label: 'Avg', value: formatThreeDartRate(stats.avgPerThreeDarts) },
]

export const computeBullRunPlayerSessionStats = (
  session: GameSession,
  playerId: string,
): BullRunSingleSessionStats | null => {
  if (session.mode !== GameModeId.BullRun || !isBullRunConfig(session.mode, session.config)) {
    return null
  }

  const { targetScore } = getBullRunConfig(session.config)
  const visits = getPlayerVisits(session.visits, playerId)
  const live = getBullRunLiveStats(session.visits, playerId)
  const lastVisit = visits.at(-1)

  return {
    score: lastVisit?.scoreAfter ?? live.score,
    targetScore,
    hitRate: live.hitRate,
    avgPerThreeDarts: live.avgPerThreeDarts,
    singlesPerThreeDarts: live.singlesPerThreeDarts,
    doublesPerThreeDarts: live.doublesPerThreeDarts,
    counts: live.counts,
    dartsThrown: live.dartsThrown,
    visitCount: visits.length,
  }
}

export const computeBullRunSingleSessionStats = (
  session: GameSession,
): BullRunSingleSessionStats | null => {
  const primary = getPrimaryPlayerVisits(session)
  const playerId = primary[0]?.playerId ?? session.players[0]?.id

  if (playerId === undefined) {
    return null
  }

  return computeBullRunPlayerSessionStats(session, playerId)
}
