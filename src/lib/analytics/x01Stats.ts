import { GameModeId } from '../../types/gameMode'
import type { GameSession } from '../../types/gameSession'
import { isX01Config } from '../game/gameConfigGuards'
import { MAX_CHECKOUT_SCORE } from '../checkout/checkoutSuggestions'
import {
  countDartsInSession,
  getPrimaryPlayerVisits,
  getMaxGameThreeDartAverage,
  getThreeDartAverage,
  sessionFinishedWithCheckout,
} from './visitStats'

export const FIVE_OH_ONE_START_SCORE = 501

export interface X01LegStats {
  gameCount: number
  checkoutGameCount: number
  threeDartAverage: number | null
  threeDartAverageUntil170: number | null
  bestGameAverage: number | null
  checkoutRate: number | null
  avgDarts: number | null
  checkoutDartCount: number
}

export interface X01Stats {
  fiveOhOne: X01LegStats
  other: X01LegStats
}

const emptyLegStats = (): X01LegStats => ({
  gameCount: 0,
  checkoutGameCount: 0,
  threeDartAverage: null,
  threeDartAverageUntil170: null,
  bestGameAverage: null,
  checkoutRate: null,
  avgDarts: null,
  checkoutDartCount: 0,
})

const isX01Session = (session: GameSession): boolean =>
  session.mode === GameModeId.X01 && isX01Config(session.mode, session.config)

const getScoringVisits = (session: GameSession) =>
  getPrimaryPlayerVisits(session).filter((visit) => visit.scoreBefore > MAX_CHECKOUT_SCORE)

const computeX01LegStats = (sessions: GameSession[]): X01LegStats => {
  if (sessions.length === 0) {
    return emptyLegStats()
  }

  const allVisits = sessions.flatMap((session) => getPrimaryPlayerVisits(session))
  const scoringVisits = sessions.flatMap((session) => getScoringVisits(session))
  const checkoutSessions = sessions.filter((session) => sessionFinishedWithCheckout(session))
  const gameCount = sessions.length
  const checkoutGameCount = checkoutSessions.length

  return {
    gameCount,
    checkoutGameCount,
    threeDartAverage: getThreeDartAverage(allVisits),
    threeDartAverageUntil170: getThreeDartAverage(scoringVisits),
    bestGameAverage: getMaxGameThreeDartAverage(sessions),
    checkoutRate: gameCount === 0 ? null : (checkoutGameCount / gameCount) * 100,
    avgDarts:
      checkoutSessions.length === 0
        ? null
        : checkoutSessions.reduce((sum, session) => sum + countDartsInSession(session), 0) /
          checkoutSessions.length,
    checkoutDartCount: checkoutSessions.length,
  }
}

export const computeX01Stats = (sessions: GameSession[]): X01Stats => {
  const x01Sessions = sessions.filter(isX01Session)
  const fiveOhOneSessions = x01Sessions.filter(
    (session) =>
      isX01Config(session.mode, session.config) &&
      session.config.startScore === FIVE_OH_ONE_START_SCORE,
  )
  const otherSessions = x01Sessions.filter(
    (session) =>
      isX01Config(session.mode, session.config) &&
      session.config.startScore !== FIVE_OH_ONE_START_SCORE,
  )

  return {
    fiveOhOne: computeX01LegStats(fiveOhOneSessions),
    other: computeX01LegStats(otherSessions),
  }
}
