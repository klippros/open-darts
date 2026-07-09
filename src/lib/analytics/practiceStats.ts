import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { gameModeDefinitions } from '../game/gameModeDefinitions'
import { getSessionModeLabel } from '../history/sessionSummary'
import {
  countCheckoutVisits,
  countDartsInSession,
  getPrimaryPlayerVisits,
  getThreeDartAverage,
} from './visitStats'

export interface CheckoutPracticeStats {
  mode: GameModeId.OneTwentyOne | GameModeId.TenUpOneDown
  label: string
  gameCount: number
  visitCount: number
  checkoutRate: number | null
  threeDartAverage: number | null
}

export interface Bob27PracticeStats {
  mode: GameModeId.Bob27
  label: string
  gameCount: number
  completedCount: number
  avgVisits: number | null
  avgFinalScore: number | null
}

export interface AroundTheClockPracticeStats {
  mode: GameModeId.AroundTheClock
  label: string
  gameCount: number
  completedCount: number
  avgDarts: number | null
  bestDarts: number | null
}

export type OtherPracticeStats = Bob27PracticeStats | AroundTheClockPracticeStats

export interface PracticeStats {
  checkout: CheckoutPracticeStats[]
  other: OtherPracticeStats[]
}

const CHECKOUT_PRACTICE_MODES = [GameModeId.OneTwentyOne, GameModeId.TenUpOneDown] as const

const getSessionLabel = (sessions: GameSession[], mode: GameModeId): string => {
  const [firstSession] = sessions

  return firstSession === undefined
    ? gameModeDefinitions[mode].label
    : getSessionModeLabel(firstSession)
}

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

  return {
    mode,
    label: getSessionLabel(modeSessions, mode),
    gameCount: modeSessions.length,
    visitCount: visits.length,
    checkoutRate: visits.length === 0 ? null : (checkoutVisits / visits.length) * 100,
    threeDartAverage: getThreeDartAverage(visits),
  }
}

const getFinalScore = (session: GameSession): number | null => {
  const lastVisit = getPrimaryPlayerVisits(session).at(-1)

  return lastVisit?.scoreAfter ?? null
}

const computeBob27Stats = (sessions: GameSession[]): Bob27PracticeStats | null => {
  const modeSessions = sessions.filter((session) => session.mode === GameModeId.Bob27)

  if (modeSessions.length === 0) {
    return null
  }

  const completedSessions = modeSessions.filter((session) => session.finishedEarly !== true)
  const visits = modeSessions.flatMap((session) => getPrimaryPlayerVisits(session))
  const finalScores = modeSessions
    .map((session) => getFinalScore(session))
    .filter((score): score is number => score !== null)

  return {
    mode: GameModeId.Bob27,
    label: getSessionLabel(modeSessions, GameModeId.Bob27),
    gameCount: modeSessions.length,
    completedCount: completedSessions.length,
    avgVisits: modeSessions.length === 0 ? null : visits.length / modeSessions.length,
    avgFinalScore:
      finalScores.length === 0
        ? null
        : finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length,
  }
}

const computeAroundTheClockStats = (
  sessions: GameSession[],
): AroundTheClockPracticeStats | null => {
  const modeSessions = sessions.filter((session) => session.mode === GameModeId.AroundTheClock)

  if (modeSessions.length === 0) {
    return null
  }

  const completedSessions = modeSessions.filter((session) => session.finishedEarly !== true)
  const dartCounts = completedSessions.map((session) => countDartsInSession(session))

  return {
    mode: GameModeId.AroundTheClock,
    label: getSessionLabel(modeSessions, GameModeId.AroundTheClock),
    gameCount: modeSessions.length,
    completedCount: completedSessions.length,
    avgDarts:
      dartCounts.length === 0
        ? null
        : dartCounts.reduce((sum, count) => sum + count, 0) / dartCounts.length,
    bestDarts: dartCounts.length === 0 ? null : Math.min(...dartCounts),
  }
}

export const computePracticeStats = (sessions: GameSession[]): PracticeStats => ({
  checkout: CHECKOUT_PRACTICE_MODES.flatMap((mode) => {
    const stats = computeCheckoutPracticeStats(mode, sessions)

    return stats === null ? [] : [stats]
  }),
  other: [computeBob27Stats(sessions), computeAroundTheClockStats(sessions)].flatMap((stats) =>
    stats === null ? [] : [stats],
  ),
})

export const isBob27PracticeStats = (stats: OtherPracticeStats): stats is Bob27PracticeStats =>
  stats.mode === GameModeId.Bob27

export const isAroundTheClockPracticeStats = (
  stats: OtherPracticeStats,
): stats is AroundTheClockPracticeStats => stats.mode === GameModeId.AroundTheClock
