import { AroundTheClockAimMode } from '@open-darts/game/types/aroundTheClock.ts'
import { GameModeId } from '@open-darts/game/types/gameMode.ts'
import type { GameSession } from '@open-darts/game/types/gameSession.ts'
import { gameModeDefinitions } from '@open-darts/game/game/gameModeDefinitions.ts'
import { getAroundTheClockAimModeLabel } from '@open-darts/game/aroundTheClock/aroundTheClockConfig.ts'
import {
  getBob27AvgHitsPerVisit,
  getBob27SessionDoublesHit,
  getBob27VisitHitRate,
} from './bob27VisitStats.ts'
import { getClaimTheBoardPrimaryPlayerStats } from './claimTheBoardVisitStats.ts'
import {
  computeBullRunSingleSessionStats,
  getBullRunHitRateFromCounts,
  mergeBullRunOutcomeCounts,
  ratePerThreeDarts,
} from './bullRunVisitStats.ts'
import {
  computeNinetyNineDartsSingleSessionStats,
  getNinetyNineDartsHitRateFromCounts,
  getNinetyNineDartsStatGroupLabel,
  mergeNinetyNineDartsOutcomeCounts,
  NinetyNineDartsStatGroup,
} from './ninetyNineVisitStats.ts'
import { emptyBaseHitCounts, emptyHitCounts } from './hitOutcomeStats.ts'
import { getSessionModeLabel } from './sessionLabels.ts'
import {
  getHighestOneTwentyOneCheckoutTarget,
  getOneTwentyOneCheckoutRate,
  getSessionCheckoutCount,
} from './oneTwentyOneVisitStats.ts'
import { aggregateAroundTheClockSessionStats } from './aroundTheClockStats.ts'
import type { AroundTheClockPerTargetStats } from './aroundTheClockStats.ts'
import { getLatestSessionStartedAt } from './pickLastPlayedVariant.ts'
import { filterAroundTheClockSessions, filterNinetyNineDartsSessions } from './sessionScope.ts'
import {
  countCheckoutVisits,
  getHighestCheckout,
  getPrimaryPlayerVisits,
  getSessionFinalScore,
  getThreeDartAverage,
} from './visitStats.ts'

export interface CheckoutPracticeStats {
  mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown
  label: string
  gameCount: number
  visitCount: number
  checkoutRate: number | null
  threeDartAverage: number | null
  avgCheckoutsPerGame: number | null
  bestCheckoutsPerGame: number | null
  highestCheckout: number | null
  lastPlayedAt: string
}

export interface Bob27PracticeStats {
  mode: GameModeId.Bob27
  label: string
  gameCount: number
  completedCount: number
  avgFinalScore: number | null
  bestFinalScore: number | null
  hitRate: number | null
  avgHitsPerVisit: number | null
  avgDoublesPerGame: number | null
  bestDoublesPerGame: number | null
}

export interface ClaimTheBoardPracticeStats {
  mode: GameModeId.ClaimTheBoard
  label: string
  gameCount: number
  avgHitsPerVisit: number | null
  avgFieldsClaimedPerGame: number | null
  avgFieldsHitOncePerGame: number | null
  avgFieldsHitTwicePerGame: number | null
  avgFieldsHitThricePerGame: number | null
  avgFinalScore: number | null
}

export interface AroundTheClockPracticeStats {
  mode: GameModeId.AroundTheClock
  aimMode: AroundTheClockAimMode
  label: string
  gameCount: number
  completedCount: number
  completionRate: number | null
  avgDartsFullRun: number | null
  bestDartsFullRun: number | null
  avgDartsPerField: number | null
  bestDartsPerField: number | null
  targets: AroundTheClockPerTargetStats[]
  lastPlayedAt: string
}

export interface NinetyNineDartsPracticeStats {
  mode: GameModeId.NinetyNineDarts
  group: NinetyNineDartsStatGroup
  label: string
  gameCount: number
  completedCount: number
  avgFinalScore: number | null
  bestFinalScore: number | null
  hitRate: number | null
  avgSinglesPerGame: number | null
  avgDoublesPerGame: number | null
  avgTreblesPerGame: number | null
  lastPlayedAt: string
}

export interface BullRunPracticeStats {
  mode: GameModeId.BullRun
  label: string
  gameCount: number
  completedCount: number
  hitRate: number | null
  singlesPerThreeDarts: number | null
  doublesPerThreeDarts: number | null
  avgPerThreeDarts: number | null
  lastPlayedAt: string
}

export type OtherPracticeStats =
  | Bob27PracticeStats
  | ClaimTheBoardPracticeStats
  | AroundTheClockPracticeStats
  | NinetyNineDartsPracticeStats
  | BullRunPracticeStats

export interface PracticeStats {
  checkout: CheckoutPracticeStats[]
  other: OtherPracticeStats[]
}

const CHECKOUT_PRACTICE_MODES = [GameModeId.OneTwentyOne, GameModeId.TenUpOneDown] as const

const AROUND_THE_CLOCK_AIM_MODES = [
  AroundTheClockAimMode.Singles,
  AroundTheClockAimMode.Doubles,
  AroundTheClockAimMode.Trebles,
  AroundTheClockAimMode.Any,
] as const

const NINETY_NINE_DARTS_STAT_GROUPS = [
  NinetyNineDartsStatGroup.Twenty,
  NinetyNineDartsStatGroup.Bull,
  NinetyNineDartsStatGroup.Other,
] as const

const getSessionLabel = (sessions: GameSession[], mode: GameModeId): string => {
  const [firstSession] = sessions

  return firstSession === undefined
    ? gameModeDefinitions[mode].label
    : getSessionModeLabel(firstSession)
}

const averageOrNull = (values: number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length

const computeCheckoutPracticeStats = (
  mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown,
  sessions: GameSession[],
): CheckoutPracticeStats | null => {
  const modeSessions = sessions.filter((session) => session.mode === mode)

  if (modeSessions.length === 0) {
    return null
  }

  const visits = modeSessions.flatMap((session) => getPrimaryPlayerVisits(session))
  const checkoutVisits = countCheckoutVisits(visits)
  const checkoutsPerGame = modeSessions.map((session) => getSessionCheckoutCount(session))

  const lastPlayedAt = getLatestSessionStartedAt(modeSessions)

  if (lastPlayedAt === null) {
    return null
  }

  return {
    mode,
    label: getSessionLabel(modeSessions, mode),
    gameCount: modeSessions.length,
    visitCount: visits.length,
    checkoutRate:
      mode === GameModeId.OneTwentyOne
        ? getOneTwentyOneCheckoutRate(visits)
        : visits.length === 0
          ? null
          : (checkoutVisits / visits.length) * 100,
    threeDartAverage: getThreeDartAverage(visits),
    avgCheckoutsPerGame:
      checkoutsPerGame.length === 0
        ? null
        : checkoutsPerGame.reduce((sum, count) => sum + count, 0) / checkoutsPerGame.length,
    bestCheckoutsPerGame: checkoutsPerGame.length === 0 ? null : Math.max(...checkoutsPerGame),
    highestCheckout:
      mode === GameModeId.OneTwentyOne
        ? getHighestOneTwentyOneCheckoutTarget(visits)
        : getHighestCheckout(visits),
    lastPlayedAt,
  }
}

const computeBob27Stats = (sessions: GameSession[]): Bob27PracticeStats | null => {
  const modeSessions = sessions.filter((session) => session.mode === GameModeId.Bob27)

  if (modeSessions.length === 0) {
    return null
  }

  const completedSessions = modeSessions.filter((session) => session.finishedEarly !== true)
  const visits = modeSessions.flatMap((session) => getPrimaryPlayerVisits(session))
  const finalScores = modeSessions
    .map((session) => getSessionFinalScore(session))
    .filter((score): score is number => score !== null)
  const doublesPerGame = completedSessions.map((session) => getBob27SessionDoublesHit(session))

  return {
    mode: GameModeId.Bob27,
    label: getSessionLabel(modeSessions, GameModeId.Bob27),
    gameCount: modeSessions.length,
    completedCount: completedSessions.length,
    avgFinalScore:
      finalScores.length === 0
        ? null
        : finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length,
    bestFinalScore: finalScores.length === 0 ? null : Math.max(...finalScores),
    hitRate: getBob27VisitHitRate(visits),
    avgHitsPerVisit: getBob27AvgHitsPerVisit(visits),
    avgDoublesPerGame:
      doublesPerGame.length === 0
        ? null
        : doublesPerGame.reduce((sum, count) => sum + count, 0) / doublesPerGame.length,
    bestDoublesPerGame: doublesPerGame.length === 0 ? null : Math.max(...doublesPerGame),
  }
}

const computeClaimTheBoardStats = (sessions: GameSession[]): ClaimTheBoardPracticeStats | null => {
  const modeSessions = sessions.filter((session) => session.mode === GameModeId.ClaimTheBoard)

  if (modeSessions.length === 0) {
    return null
  }

  const perGame = modeSessions
    .map((session) => getClaimTheBoardPrimaryPlayerStats(session))
    .filter((stats): stats is NonNullable<typeof stats> => stats !== null)

  if (perGame.length === 0) {
    return null
  }

  const allVisits = modeSessions.flatMap((session) => getPrimaryPlayerVisits(session))
  const totalHits = perGame.reduce((sum, stats) => sum + stats.totalHits, 0)

  return {
    mode: GameModeId.ClaimTheBoard,
    label: getSessionLabel(modeSessions, GameModeId.ClaimTheBoard),
    gameCount: modeSessions.length,
    avgHitsPerVisit: allVisits.length === 0 ? null : totalHits / allVisits.length,
    avgFieldsClaimedPerGame: averageOrNull(perGame.map((stats) => stats.fieldsClaimed)),
    avgFieldsHitOncePerGame: averageOrNull(perGame.map((stats) => stats.fieldsHitOnce)),
    avgFieldsHitTwicePerGame: averageOrNull(perGame.map((stats) => stats.fieldsHitTwice)),
    avgFieldsHitThricePerGame: averageOrNull(perGame.map((stats) => stats.fieldsHitThrice)),
    avgFinalScore: averageOrNull(
      perGame.map((stats) => stats.finalScore).filter((score): score is number => score !== null),
    ),
  }
}

const computeAroundTheClockStatsForAimMode = (
  sessions: GameSession[],
  aimMode: AroundTheClockAimMode,
): AroundTheClockPracticeStats | null => {
  const aimModeSessions = filterAroundTheClockSessions(sessions, aimMode)

  if (aimModeSessions.length === 0) {
    return null
  }

  const aggregated = aggregateAroundTheClockSessionStats(aimModeSessions, aimMode)
  const completedSessions = aimModeSessions.filter((session) => session.finishedEarly !== true)
  const lastPlayedAt = getLatestSessionStartedAt(aimModeSessions)

  if (lastPlayedAt === null) {
    return null
  }

  return {
    mode: GameModeId.AroundTheClock,
    aimMode,
    label: `${gameModeDefinitions[GameModeId.AroundTheClock].label} · ${getAroundTheClockAimModeLabel(aimMode)}`,
    gameCount: aimModeSessions.length,
    completedCount: completedSessions.length,
    completionRate: aggregated.completionRate,
    avgDartsFullRun: aggregated.avgDartsFullRun,
    bestDartsFullRun: aggregated.bestDartsFullRun,
    avgDartsPerField: aggregated.avgDartsPerField,
    bestDartsPerField: aggregated.bestDartsPerField,
    targets: aggregated.targets,
    lastPlayedAt,
  }
}

const computeNinetyNineDartsStatsForGroup = (
  sessions: GameSession[],
  group: NinetyNineDartsStatGroup,
): NinetyNineDartsPracticeStats | null => {
  const groupSessions = filterNinetyNineDartsSessions(sessions, group)

  if (groupSessions.length === 0) {
    return null
  }

  const completedSessions = groupSessions.filter((session) => session.finishedEarly !== true)
  const lastPlayedAt = getLatestSessionStartedAt(groupSessions)

  if (lastPlayedAt === null) {
    return null
  }

  const sessionStats = groupSessions
    .map((session) => computeNinetyNineDartsSingleSessionStats(session))
    .filter((stats): stats is NonNullable<typeof stats> => stats !== null)

  const finalScores = sessionStats
    .map((stats) => stats.score)
    .filter((score): score is number => score !== null)

  const totals = sessionStats.reduce(
    (counts, stats) => mergeNinetyNineDartsOutcomeCounts(counts, stats.counts),
    emptyHitCounts(),
  )

  return {
    mode: GameModeId.NinetyNineDarts,
    group,
    label: `${gameModeDefinitions[GameModeId.NinetyNineDarts].label} · ${getNinetyNineDartsStatGroupLabel(group)}`,
    gameCount: groupSessions.length,
    completedCount: completedSessions.length,
    avgFinalScore: averageOrNull(finalScores),
    bestFinalScore: finalScores.length === 0 ? null : Math.max(...finalScores),
    hitRate: getNinetyNineDartsHitRateFromCounts(totals),
    avgSinglesPerGame: averageOrNull(sessionStats.map((stats) => stats.counts.singles)),
    avgDoublesPerGame: averageOrNull(sessionStats.map((stats) => stats.counts.doubles)),
    avgTreblesPerGame:
      group === NinetyNineDartsStatGroup.Bull
        ? null
        : averageOrNull(sessionStats.map((stats) => stats.counts.trebles)),
    lastPlayedAt,
  }
}

const computeBullRunStats = (sessions: GameSession[]): BullRunPracticeStats | null => {
  const modeSessions = sessions.filter((session) => session.mode === GameModeId.BullRun)

  if (modeSessions.length === 0) {
    return null
  }

  const completedSessions = modeSessions.filter((session) => session.finishedEarly !== true)
  const lastPlayedAt = getLatestSessionStartedAt(modeSessions)

  if (lastPlayedAt === null) {
    return null
  }

  const sessionStats = modeSessions
    .map((session) => computeBullRunSingleSessionStats(session))
    .filter((stats): stats is NonNullable<typeof stats> => stats !== null)

  const totals = sessionStats.reduce(
    (counts, stats) => mergeBullRunOutcomeCounts(counts, stats.counts),
    emptyBaseHitCounts(),
  )
  const totalDarts = sessionStats.reduce((sum, stats) => sum + stats.dartsThrown, 0)
  const totalPoints = sessionStats.reduce((sum, stats) => sum + (stats.score ?? 0), 0)

  return {
    mode: GameModeId.BullRun,
    label: gameModeDefinitions[GameModeId.BullRun].label,
    gameCount: modeSessions.length,
    completedCount: completedSessions.length,
    hitRate: getBullRunHitRateFromCounts(totals),
    singlesPerThreeDarts: ratePerThreeDarts(totals.singles, totalDarts),
    doublesPerThreeDarts: ratePerThreeDarts(totals.doubles, totalDarts),
    avgPerThreeDarts: ratePerThreeDarts(totalPoints, totalDarts),
    lastPlayedAt,
  }
}

export const computePracticeStats = (sessions: GameSession[]): PracticeStats => ({
  checkout: CHECKOUT_PRACTICE_MODES.flatMap((mode) => {
    const stats = computeCheckoutPracticeStats(mode, sessions)

    return stats === null ? [] : [stats]
  }),
  other: [
    computeBob27Stats(sessions),
    computeClaimTheBoardStats(sessions),
    ...AROUND_THE_CLOCK_AIM_MODES.map((aimMode) =>
      computeAroundTheClockStatsForAimMode(sessions, aimMode),
    ),
    ...NINETY_NINE_DARTS_STAT_GROUPS.map((group) =>
      computeNinetyNineDartsStatsForGroup(sessions, group),
    ),
    computeBullRunStats(sessions),
  ].flatMap((stats) => (stats === null ? [] : [stats])),
})

export const isBob27PracticeStats = (stats: OtherPracticeStats): stats is Bob27PracticeStats =>
  stats.mode === GameModeId.Bob27

export const isClaimTheBoardPracticeStats = (
  stats: OtherPracticeStats,
): stats is ClaimTheBoardPracticeStats => stats.mode === GameModeId.ClaimTheBoard

export const isAroundTheClockPracticeStats = (
  stats: OtherPracticeStats,
): stats is AroundTheClockPracticeStats => stats.mode === GameModeId.AroundTheClock

export const isNinetyNineDartsPracticeStats = (
  stats: OtherPracticeStats,
): stats is NinetyNineDartsPracticeStats => stats.mode === GameModeId.NinetyNineDarts

export const isBullRunPracticeStats = (stats: OtherPracticeStats): stats is BullRunPracticeStats =>
  stats.mode === GameModeId.BullRun
