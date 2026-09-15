import type { DartThrow } from '@open-darts/game/types/dart'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { GameSession } from '@open-darts/game/types/gameSession'
import {
  NinetyNineDartsOutcome,
  NinetyNineDartsTargetKind,
} from '@open-darts/game/types/ninetyNineDarts'
import type { NinetyNineDartsTarget } from '@open-darts/game/types/ninetyNineDarts'
import { isCountingVisit } from '@open-darts/game/types/visit'
import type { Visit } from '@open-darts/game/types/visit'
import { isNinetyNineDartsConfig } from '@open-darts/game/game/gameConfigGuards'
import { getNinetyNineDartsConfig } from '@open-darts/game/ninetyNineDarts/ninetyNineDartsConfig'
import {
  getNinetyNineDartsDartPoints,
  getNinetyNineDartsMaxScore,
  getNinetyNineDartsOutcome,
  getNinetyNineDartsTargetLabel,
  NINETY_NINE_DARTS_DART_COUNT,
} from '@open-darts/game/ninetyNineDarts/ninetyNineDartsRules'
import { getPrimaryPlayerVisits, getSessionFinalScore } from '../analytics/visitStats'

export interface NinetyNineDartsOutcomeCounts {
  singles: number
  doubles: number
  trebles: number
  misses: number
}

export interface NinetyNineDartsLiveStats {
  score: number
  dartsThrown: number
  dartsRemaining: number
  hitRate: number | null
  counts: NinetyNineDartsOutcomeCounts
  maxScore: number
  targetLabel: string
  isBull: boolean
}

export interface NinetyNineDartsSingleSessionStats {
  score: number | null
  maxScore: number
  hitRate: number | null
  counts: NinetyNineDartsOutcomeCounts
  dartsThrown: number
  visitCount: number
  targetLabel: string
  isBull: boolean
}

const emptyCounts = (): NinetyNineDartsOutcomeCounts => ({
  singles: 0,
  doubles: 0,
  trebles: 0,
  misses: 0,
})

export const accumulateNinetyNineDartsOutcome = (
  counts: NinetyNineDartsOutcomeCounts,
  outcome: NinetyNineDartsOutcome,
): NinetyNineDartsOutcomeCounts => {
  switch (outcome) {
    case NinetyNineDartsOutcome.Miss:
      return { ...counts, misses: counts.misses + 1 }
    case NinetyNineDartsOutcome.Single:
      return { ...counts, singles: counts.singles + 1 }
    case NinetyNineDartsOutcome.Double:
      return { ...counts, doubles: counts.doubles + 1 }
    case NinetyNineDartsOutcome.Triple:
      return { ...counts, trebles: counts.trebles + 1 }
    default: {
      const exhaustive: never = outcome
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`)
    }
  }
}

export const countNinetyNineDartsOutcomes = (
  darts: DartThrow[],
  target: NinetyNineDartsTarget,
): NinetyNineDartsOutcomeCounts =>
  darts.reduce(
    (counts, dart) =>
      accumulateNinetyNineDartsOutcome(counts, getNinetyNineDartsOutcome(dart, target)),
    emptyCounts(),
  )

export const mergeNinetyNineDartsOutcomeCounts = (
  left: NinetyNineDartsOutcomeCounts,
  right: NinetyNineDartsOutcomeCounts,
): NinetyNineDartsOutcomeCounts => ({
  singles: left.singles + right.singles,
  doubles: left.doubles + right.doubles,
  trebles: left.trebles + right.trebles,
  misses: left.misses + right.misses,
})

export const getNinetyNineDartsHitCount = (counts: NinetyNineDartsOutcomeCounts): number =>
  counts.singles + counts.doubles + counts.trebles

export const getNinetyNineDartsHitRateFromCounts = (
  counts: NinetyNineDartsOutcomeCounts,
): number | null => {
  const dartsThrown = getNinetyNineDartsHitCount(counts) + counts.misses

  if (dartsThrown === 0) {
    return null
  }

  return (getNinetyNineDartsHitCount(counts) / dartsThrown) * 100
}

export interface NinetyNineDartsLiveScoreMetric {
  label: string
  value: string
}

export const getNinetyNineDartsLiveScoreMetrics = (
  stats: NinetyNineDartsLiveStats,
): NinetyNineDartsLiveScoreMetric[] => {
  const hitRateLabel = stats.hitRate === null ? '—' : `${Math.round(stats.hitRate)}%`
  const metrics: NinetyNineDartsLiveScoreMetric[] = [
    { label: 'Left', value: String(stats.dartsRemaining) },
    { label: 'Points', value: String(stats.score) },
  ]

  if (!stats.isBull) {
    metrics.push({ label: 'Triples', value: String(stats.counts.trebles) })
  }

  metrics.push(
    { label: 'Singles', value: String(stats.counts.singles) },
    { label: 'Doubles', value: String(stats.counts.doubles) },
    { label: 'Hit %', value: hitRateLabel },
  )

  return metrics
}

export const getNinetyNineDartsLiveStats = (
  visits: Visit[],
  playerId: string,
  target: NinetyNineDartsTarget,
  pendingDarts: DartThrow[] = [],
  includePending = true,
): NinetyNineDartsLiveStats => {
  const playerVisits = visits.filter(
    (visit) => visit.playerId === playerId && isCountingVisit(visit),
  )
  const committedDarts = playerVisits.flatMap((visit) => visit.darts)
  const allDarts = includePending ? [...committedDarts, ...pendingDarts] : committedDarts
  const counts = countNinetyNineDartsOutcomes(allDarts, target)
  const score = allDarts.reduce(
    (total, dart) => total + getNinetyNineDartsDartPoints(dart, target),
    0,
  )

  return {
    score,
    dartsThrown: allDarts.length,
    dartsRemaining: Math.max(0, NINETY_NINE_DARTS_DART_COUNT - allDarts.length),
    hitRate: getNinetyNineDartsHitRateFromCounts(counts),
    counts,
    maxScore: getNinetyNineDartsMaxScore(target),
    targetLabel: getNinetyNineDartsTargetLabel(target),
    isBull: target.kind === NinetyNineDartsTargetKind.Bull,
  }
}

export const computeNinetyNineDartsSingleSessionStats = (
  session: GameSession,
): NinetyNineDartsSingleSessionStats | null => {
  if (
    session.mode !== GameModeId.NinetyNineDarts ||
    !isNinetyNineDartsConfig(session.mode, session.config)
  ) {
    return null
  }

  const playerId = session.players[0]?.id

  if (playerId === undefined) {
    return null
  }

  const { target } = getNinetyNineDartsConfig(session.config)
  const live = getNinetyNineDartsLiveStats(session.visits, playerId, target)
  const visits = getPrimaryPlayerVisits(session)

  return {
    score: getSessionFinalScore(session) ?? live.score,
    maxScore: live.maxScore,
    hitRate: live.hitRate,
    counts: live.counts,
    dartsThrown: live.dartsThrown,
    visitCount: visits.length,
    targetLabel: live.targetLabel,
    isBull: live.isBull,
  }
}

export enum NinetyNineDartsStatGroup {
  Twenty = '20',
  Bull = 'bull',
  Other = 'other',
}

export const getNinetyNineDartsStatGroup = (
  target: NinetyNineDartsTarget,
): NinetyNineDartsStatGroup => {
  if (target.kind === NinetyNineDartsTargetKind.Bull) {
    return NinetyNineDartsStatGroup.Bull
  }

  if (target.value === 20) {
    return NinetyNineDartsStatGroup.Twenty
  }

  return NinetyNineDartsStatGroup.Other
}

export const getNinetyNineDartsStatGroupLabel = (group: NinetyNineDartsStatGroup): string => {
  switch (group) {
    case NinetyNineDartsStatGroup.Twenty:
      return '20'
    case NinetyNineDartsStatGroup.Bull:
      return 'Bull'
    case NinetyNineDartsStatGroup.Other:
      return 'Other'
    default: {
      const exhaustive: never = group
      throw new Error(`Unhandled group: ${String(exhaustive)}`)
    }
  }
}
