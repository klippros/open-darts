import type { GameSession } from '../../types/gameSession'
import { isX01Config } from '../game/gameConfigGuards'
import { x01PresetConfigs, X01PresetId } from '../x01/x01Presets'
import {
  countDoubleCheckoutStats,
  mergeDoubleCheckoutStats,
  type DoubleCheckoutStats,
  emptyDoubleCheckoutStats,
} from './doubleCheckoutStats'
import { filterFiveOhOneSessions, filterOtherX01Sessions } from './sessionScope'
import {
  countCheckouts100Plus,
  countDartsInSession,
  countThrown100Plus,
  countThrown140Plus,
  countThrown180,
  getHighestCheckout,
  getHighestVisit,
  getMaxGameThreeDartAverage,
  getPrimaryPlayerVisits,
  getScoringVisits,
  getThreeDartAverage,
  sessionFinishedWithCheckout,
} from './visitStats'

export const FIVE_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.FiveOhOne].startScore

export interface X01LegStats {
  gameCount: number
  checkoutGameCount: number
  threeDartAverage: number | null
  threeDartAverageUntil170: number | null
  bestGameAverage: number | null
  avgDarts: number | null
  thrown180: number
  thrown140Plus: number
  thrown100Plus: number
  doubleCheckout: DoubleCheckoutStats
  checkouts100Plus: number
  highestCheckout: number | null
  highestVisit: number | null
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
  avgDarts: null,
  thrown180: 0,
  thrown140Plus: 0,
  thrown100Plus: 0,
  doubleCheckout: emptyDoubleCheckoutStats(),
  checkouts100Plus: 0,
  highestCheckout: null,
  highestVisit: null,
})

const computeX01LegStats = (sessions: GameSession[]): X01LegStats => {
  if (sessions.length === 0) {
    return emptyLegStats()
  }

  const allVisits = sessions.flatMap((session) => getPrimaryPlayerVisits(session))
  const scoringVisits = sessions.flatMap((session) =>
    getScoringVisits(getPrimaryPlayerVisits(session)),
  )
  const checkoutSessions = sessions.filter((session) => sessionFinishedWithCheckout(session))

  const doubleCheckout = sessions.reduce<DoubleCheckoutStats>((totals, session) => {
    if (!isX01Config(session.mode, session.config)) {
      return totals
    }

    const visits = getPrimaryPlayerVisits(session)
    const sessionStats = countDoubleCheckoutStats(
      visits,
      {
        doubleIn: session.config.doubleIn,
        doubleOut: session.config.doubleOut,
      },
      session.config.doubleIn,
    )

    return mergeDoubleCheckoutStats(totals, sessionStats)
  }, emptyDoubleCheckoutStats())

  return {
    gameCount: sessions.length,
    checkoutGameCount: checkoutSessions.length,
    threeDartAverage: getThreeDartAverage(allVisits),
    threeDartAverageUntil170: getThreeDartAverage(scoringVisits),
    bestGameAverage: getMaxGameThreeDartAverage(sessions),
    avgDarts:
      checkoutSessions.length === 0
        ? null
        : checkoutSessions.reduce((sum, session) => sum + countDartsInSession(session), 0) /
          checkoutSessions.length,
    thrown180: countThrown180(allVisits),
    thrown140Plus: countThrown140Plus(allVisits),
    thrown100Plus: countThrown100Plus(allVisits),
    doubleCheckout,
    checkouts100Plus: countCheckouts100Plus(allVisits),
    highestCheckout: getHighestCheckout(allVisits),
    highestVisit: getHighestVisit(allVisits),
  }
}

export const computeX01Stats = (sessions: GameSession[]): X01Stats => ({
  fiveOhOne: computeX01LegStats(filterFiveOhOneSessions(sessions)),
  other: computeX01LegStats(filterOtherX01Sessions(sessions)),
})
