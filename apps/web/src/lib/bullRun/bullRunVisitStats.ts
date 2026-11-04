import type { DartThrow } from '@open-darts/game/types/dart'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import { BullRunOutcome } from '@open-darts/game/types/bullRun'
import { isCountingVisit } from '@open-darts/game/types/visit'
import type { Visit } from '@open-darts/game/types/visit'
import { isBullRunConfig } from '@open-darts/game/game/gameConfigGuards'
import { getBullRunConfig } from '@open-darts/game/bullRun/bullRunConfig'
import { getBullRunDartPoints, getBullRunOutcome } from '@open-darts/game/bullRun/bullRunRules'
import type { ScoreMetric } from '../../components/Scoreboard/scoreMetrics'
import { getPlayerVisits, getPrimaryPlayerVisits } from '../analytics/visitStats'

export interface BullRunOutcomeCounts {
  singles: number
  doubles: number
  misses: number
}

export interface BullRunLiveStats {
  score: number
  dartsThrown: number
  hitRate: number | null
  avgPerThreeDarts: number | null
  singlesPerThreeDarts: number | null
  doublesPerThreeDarts: number | null
  counts: BullRunOutcomeCounts
  targetScore: number
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

const emptyCounts = (): BullRunOutcomeCounts => ({
  singles: 0,
  doubles: 0,
  misses: 0,
})

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
    emptyCounts(),
  )

export const mergeBullRunOutcomeCounts = (
  left: BullRunOutcomeCounts,
  right: BullRunOutcomeCounts,
): BullRunOutcomeCounts => ({
  singles: left.singles + right.singles,
  doubles: left.doubles + right.doubles,
  misses: left.misses + right.misses,
})

export const getBullRunHitCount = (counts: BullRunOutcomeCounts): number =>
  counts.singles + counts.doubles

export const getBullRunHitRateFromCounts = (counts: BullRunOutcomeCounts): number | null => {
  const dartsThrown = getBullRunHitCount(counts) + counts.misses

  if (dartsThrown === 0) {
    return null
  }

  return (getBullRunHitCount(counts) / dartsThrown) * 100
}

/** Normalize a per-dart rate to a three-dart average. */
export const ratePerThreeDarts = (count: number, dartsThrown: number): number | null => {
  if (dartsThrown === 0) {
    return null
  }

  return (count / dartsThrown) * 3
}

export const getBullRunLiveStats = (
  visits: Visit[],
  playerId: string,
  pendingDarts: DartThrow[] = [],
  includePending = true,
): BullRunLiveStats => {
  const playerVisits = visits.filter(
    (visit) => visit.playerId === playerId && isCountingVisit(visit),
  )
  const committedDarts = playerVisits.flatMap((visit) => visit.darts)
  const allDarts = includePending ? [...committedDarts, ...pendingDarts] : committedDarts
  const counts = countBullRunOutcomes(allDarts)
  const score = allDarts.reduce((total, dart) => total + getBullRunDartPoints(dart), 0)
  const lastVisit = playerVisits.at(-1)
  const targetFromVisit =
    typeof lastVisit?.metadata?.targetScore === 'number' ? lastVisit.metadata.targetScore : null

  return {
    score,
    dartsThrown: allDarts.length,
    hitRate: getBullRunHitRateFromCounts(counts),
    avgPerThreeDarts: ratePerThreeDarts(score, allDarts.length),
    singlesPerThreeDarts: ratePerThreeDarts(counts.singles, allDarts.length),
    doublesPerThreeDarts: ratePerThreeDarts(counts.doubles, allDarts.length),
    counts,
    targetScore: targetFromVisit ?? 0,
  }
}

const formatThreeDartRate = (value: number | null): string =>
  value === null ? '—' : value.toFixed(2)

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
