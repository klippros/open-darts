import { AroundTheClockAimMode } from '../../types/aroundTheClock'
import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { gameModeDefinitions } from '../game/gameModeDefinitions'
import { getAroundTheClockAimModeLabel } from '../aroundTheClock/aroundTheClockConfig'
import { getSessionModeLabel } from '../history/sessionSummary'
import {
  aggregateAroundTheClockSessionStats,
  type AroundTheClockPerTargetStats,
} from './aroundTheClockStats'
import { filterAroundTheClockSessions } from './sessionScope'
import {
  countCheckoutVisits,
  getPrimaryPlayerVisits,
  getSessionFinalScore,
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
}

export type OtherPracticeStats = Bob27PracticeStats | AroundTheClockPracticeStats

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
  }
}

export const computePracticeStats = (sessions: GameSession[]): PracticeStats => ({
  checkout: CHECKOUT_PRACTICE_MODES.flatMap((mode) => {
    const stats = computeCheckoutPracticeStats(mode, sessions)

    return stats === null ? [] : [stats]
  }),
  other: [
    computeBob27Stats(sessions),
    ...AROUND_THE_CLOCK_AIM_MODES.map((aimMode) =>
      computeAroundTheClockStatsForAimMode(sessions, aimMode),
    ),
  ].flatMap((stats) => (stats === null ? [] : [stats])),
})

export const isBob27PracticeStats = (stats: OtherPracticeStats): stats is Bob27PracticeStats =>
  stats.mode === GameModeId.Bob27

export const isAroundTheClockPracticeStats = (
  stats: OtherPracticeStats,
): stats is AroundTheClockPracticeStats => stats.mode === GameModeId.AroundTheClock
