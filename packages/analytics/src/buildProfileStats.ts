import { GameModeId, GameStatus } from '@open-darts/game/types/gameMode.ts'
import type { GameSession } from '@open-darts/game/types/gameSession.ts'
import { PlayerKind } from '@open-darts/game/types/player.ts'
import { isAroundTheClockConfig } from '@open-darts/game/game/gameConfigGuards.ts'
import { getAroundTheClockConfig } from '@open-darts/game/aroundTheClock/aroundTheClockConfig.ts'
import { aggregateAroundTheClockSessionStats } from './aroundTheClockStats.ts'
import {
  isBob27PracticeStats,
  isNinetyNineDartsPracticeStats,
  computePracticeStats,
} from './practiceStats.ts'
import { filterFiveOhOneSessions, filterNinetyNineDartsSessions } from './sessionScope.ts'
import { getSessionCompletedAt } from './sessionLabels.ts'
import {
  countDartsInVisits,
  expandX01SessionsLegs,
  legFinishedWithCheckout,
} from './x01LegSlices.ts'
import { computeX01Stats } from './x01Stats.ts'
import { countTotalDartsThrown, countThrown180 } from './visitStats.ts'
import { NinetyNineDartsStatGroup } from './ninetyNineVisitStats.ts'

export const PROFILE_STATS_VERSION = 1
export const PROFILE_ACTIVE_DAYS = 30

export interface ProfileStatWindow {
  startAt: string
  endAt: string
}

export interface ProfileFiveOhOneStats {
  window: ProfileStatWindow
  threeDartAverage: number | null
  threeDartAverageUntil170: number | null
  checkoutPercent: number | null
  legsPlayed: number
  legWinRate: number | null
  dartsThrown: number
  bestLegDarts: number | null
  highestCheckout: number | null
  highestVisit: number | null
  thrown180: number | null
}

export interface ProfileBob27Stats {
  window: ProfileStatWindow
  sessionsPlayed: number
  avgFinalScore: number | null
  hitRate: number | null
  bestFinalScore: number | null
}

export interface ProfileNinetyNineDartsStats {
  window: ProfileStatWindow
  sessionsPlayed: number
  avgFinalScore: number | null
  hitRate: number | null
  avgTreblesPerGame: number | null
}

export interface ProfileAroundTheClockStats {
  window: ProfileStatWindow
  sessionsPlayed: number
  avgDartsFullRun: number | null
  avgDartsPerField: number | null
  bestDartsFullRun: number | null
}

export interface PlayerProfileStats {
  version: typeof PROFILE_STATS_VERSION
  displayName: string
  fiveOhOne: ProfileFiveOhOneStats | null
  bob27: ProfileBob27Stats | null
  ninetyNineDarts: ProfileNinetyNineDartsStats | null
  aroundTheClock: ProfileAroundTheClockStats | null
}

export interface BuildProfileStatsInput {
  displayName: string
  onlineSessions: GameSession[]
  practiceSessions: GameSession[]
  profileUserId: string
}

const ACTIVE_WINDOW_MS = PROFILE_ACTIVE_DAYS * 24 * 60 * 60 * 1000

const isCompleted = (session: GameSession): boolean => session.status === GameStatus.Completed

const windowFromAnchor = (anchorAt: string): ProfileStatWindow => {
  const end = new Date(anchorAt)
  const start = new Date(end.getTime() - ACTIVE_WINDOW_MS)
  return { startAt: start.toISOString(), endAt: end.toISOString() }
}

const sessionsInWindow = (sessions: GameSession[], window: ProfileStatWindow): GameSession[] =>
  sessions.filter((session) => {
    const completedAt = getSessionCompletedAt(session)
    return completedAt >= window.startAt && completedAt <= window.endAt
  })

const latestCompletedAt = (sessions: GameSession[]): string | null => {
  let latest: string | null = null
  for (const session of sessions) {
    if (!isCompleted(session)) {
      continue
    }
    const completedAt = getSessionCompletedAt(session)
    if (latest === null || completedAt > latest) {
      latest = completedAt
    }
  }
  return latest
}

/** Orient an online session so the profile user is the primary Human player. */
export const orientSessionForProfileUser = (
  session: GameSession,
  profileUserId: string,
): GameSession => ({
  ...session,
  players: session.players.map((player) => ({
    ...player,
    kind: player.id === profileUserId ? PlayerKind.Human : PlayerKind.Remote,
  })),
})

const computeBestLegDarts = (sessions: GameSession[]): number | null => {
  const checkoutLegs = expandX01SessionsLegs(sessions).filter((leg) =>
    legFinishedWithCheckout(leg.visits),
  )

  if (checkoutLegs.length === 0) {
    return null
  }

  return Math.min(...checkoutLegs.map((leg) => countDartsInVisits(leg.visits)))
}

const computeLegWinRate = (sessions: GameSession[], profileUserId: string): number | null => {
  let wins = 0
  let hasRecordedWins = false
  let legsPlayed = 0

  for (const session of sessions) {
    const progress = session.matchProgress
    if (progress === undefined) {
      continue
    }

    const playerWins = progress.legWins[profileUserId]
    if (typeof playerWins === 'number') {
      hasRecordedWins = true
      wins += playerWins
    }

    legsPlayed += expandX01SessionsLegs([session]).length
  }

  if (!hasRecordedWins || legsPlayed === 0) {
    return null
  }

  return (wins / legsPlayed) * 100
}

const checkoutPercent = (stats: {
  doubleCheckout: { attempts: number; successes: number }
  doubleCheckoutUnavailable: boolean
}): number | null => {
  if (stats.doubleCheckoutUnavailable || stats.doubleCheckout.attempts === 0) {
    return null
  }

  return (stats.doubleCheckout.successes / stats.doubleCheckout.attempts) * 100
}

const buildFiveOhOneStats = (
  onlineSessions: GameSession[],
  profileUserId: string,
): ProfileFiveOhOneStats | null => {
  const fiveOhOne = filterFiveOhOneSessions(onlineSessions.filter(isCompleted))
  const anchor = latestCompletedAt(fiveOhOne)
  if (anchor === null) {
    return null
  }

  const window = windowFromAnchor(anchor)
  const windowSessions = sessionsInWindow(fiveOhOne, window)
  if (windowSessions.length === 0) {
    return null
  }

  const oriented = windowSessions.map((session) =>
    orientSessionForProfileUser(session, profileUserId),
  )
  const stats = computeX01Stats(oriented).fiveOhOne
  const thrown180 = countThrown180(
    oriented.flatMap((session) => expandX01SessionsLegs([session]).flatMap((leg) => leg.visits)),
  )

  return {
    window,
    threeDartAverage: stats.threeDartAverage,
    threeDartAverageUntil170: stats.threeDartAverageUntil170,
    checkoutPercent: checkoutPercent(stats),
    legsPlayed: stats.legCount,
    legWinRate: computeLegWinRate(oriented, profileUserId),
    dartsThrown: countTotalDartsThrown(oriented),
    bestLegDarts: computeBestLegDarts(oriented),
    highestCheckout: stats.highestCheckout,
    highestVisit: thrown180 > 0 ? null : stats.highestVisit,
    thrown180: thrown180 > 0 ? thrown180 : null,
  }
}

const buildBob27Stats = (practiceSessions: GameSession[]): ProfileBob27Stats | null => {
  const modeSessions = practiceSessions.filter(
    (session) => isCompleted(session) && session.mode === GameModeId.Bob27,
  )
  const anchor = latestCompletedAt(modeSessions)
  if (anchor === null) {
    return null
  }

  const window = windowFromAnchor(anchor)
  const windowSessions = sessionsInWindow(modeSessions, window)
  if (windowSessions.length === 0) {
    return null
  }

  const practice = computePracticeStats(windowSessions).other.find(isBob27PracticeStats)
  if (practice === undefined) {
    return null
  }

  return {
    window,
    sessionsPlayed: practice.gameCount,
    avgFinalScore: practice.avgFinalScore,
    hitRate: practice.hitRate,
    bestFinalScore: practice.bestFinalScore,
  }
}

const buildNinetyNineDartsStats = (
  practiceSessions: GameSession[],
): ProfileNinetyNineDartsStats | null => {
  const modeSessions = practiceSessions.filter(
    (session) => isCompleted(session) && session.mode === GameModeId.NinetyNineDarts,
  )
  const anchor = latestCompletedAt(modeSessions)
  if (anchor === null) {
    return null
  }

  const window = windowFromAnchor(anchor)
  const windowSessions = sessionsInWindow(modeSessions, window)
  if (windowSessions.length === 0) {
    return null
  }

  const atTwenty = filterNinetyNineDartsSessions(windowSessions, NinetyNineDartsStatGroup.Twenty)
  const practice = computePracticeStats(atTwenty).other.find(isNinetyNineDartsPracticeStats)

  return {
    window,
    sessionsPlayed: windowSessions.length,
    avgFinalScore: practice?.avgFinalScore ?? null,
    hitRate: practice?.hitRate ?? null,
    avgTreblesPerGame: practice?.avgTreblesPerGame ?? null,
  }
}

const buildAroundTheClockStats = (
  practiceSessions: GameSession[],
): ProfileAroundTheClockStats | null => {
  const modeSessions = practiceSessions.filter(
    (session) =>
      isCompleted(session) &&
      session.mode === GameModeId.AroundTheClock &&
      isAroundTheClockConfig(session.mode, session.config),
  )
  const anchor = latestCompletedAt(modeSessions)
  if (anchor === null) {
    return null
  }

  const window = windowFromAnchor(anchor)
  const windowSessions = sessionsInWindow(modeSessions, window)
  if (windowSessions.length === 0) {
    return null
  }

  // Pool every aim mode by scoring each session with its own configured aim mode.
  const perSession = windowSessions
    .map((session) => {
      if (!isAroundTheClockConfig(session.mode, session.config)) {
        return null
      }
      const { aimMode } = getAroundTheClockConfig(session.config)
      return aggregateAroundTheClockSessionStats([session], aimMode)
    })
    .filter((stats): stats is NonNullable<typeof stats> => stats !== null)

  const completedRuns = perSession
    .map((stats) => stats.bestDartsFullRun)
    .filter((value): value is number => value !== null)
  const avgFullRuns = perSession
    .map((stats) => stats.avgDartsFullRun)
    .filter((value): value is number => value !== null)
  const avgPerField = perSession
    .map((stats) => stats.avgDartsPerField)
    .filter((value): value is number => value !== null)

  return {
    window,
    sessionsPlayed: windowSessions.length,
    avgDartsFullRun:
      avgFullRuns.length === 0
        ? null
        : avgFullRuns.reduce((sum, value) => sum + value, 0) / avgFullRuns.length,
    avgDartsPerField:
      avgPerField.length === 0
        ? null
        : avgPerField.reduce((sum, value) => sum + value, 0) / avgPerField.length,
    bestDartsFullRun: completedRuns.length === 0 ? null : Math.min(...completedRuns),
  }
}

export const buildProfileStats = (input: BuildProfileStatsInput): PlayerProfileStats => {
  const online = input.onlineSessions
    .filter(isCompleted)
    .map((session) => orientSessionForProfileUser(session, input.profileUserId))
  const practice = input.practiceSessions.filter(isCompleted)

  return {
    version: PROFILE_STATS_VERSION,
    displayName: input.displayName,
    fiveOhOne: buildFiveOhOneStats(online, input.profileUserId),
    bob27: buildBob27Stats(practice),
    ninetyNineDarts: buildNinetyNineDartsStats(practice),
    aroundTheClock: buildAroundTheClockStats(practice),
  }
}
