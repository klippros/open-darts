import type { GameSession } from '../../types/gameSession'
import { isX01Config } from '../game/gameConfigGuards'
import { x01PresetConfigs, X01PresetId } from '../x01/x01Presets'
import {
  countDoubleCheckoutStats,
  mergeDoubleCheckoutStats,
  emptyDoubleCheckoutStats,
} from './doubleCheckoutStats'
import type { DoubleCheckoutStats } from './doubleCheckoutStats'
import { filterFiveOhOneSessions, filterOtherX01Sessions } from './sessionScope'
import {
  countCheckouts100Plus,
  countThrown100Plus,
  countThrown140Plus,
  countThrown180,
  getHighestCheckout,
  getHighestVisit,
  getMaxThreeDartAverage,
  getScoringVisits,
  getThreeDartAverage,
} from './visitStats'
import { countDartsInVisits, expandX01SessionsLegs, legFinishedWithCheckout } from './x01LegSlices'

export const FIVE_OH_ONE_START_SCORE = x01PresetConfigs[X01PresetId.FiveOhOne].startScore

export interface X01LegStats {
  legCount: number
  checkoutLegCount: number
  threeDartAverage: number | null
  threeDartAverageUntil170: number | null
  bestLegAverage: number | null
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
  legCount: 0,
  checkoutLegCount: 0,
  threeDartAverage: null,
  threeDartAverageUntil170: null,
  bestLegAverage: null,
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
  const legs = expandX01SessionsLegs(sessions)

  if (legs.length === 0) {
    return emptyLegStats()
  }

  const allVisits = legs.flatMap((leg) => leg.visits)
  const scoringVisits = legs.flatMap((leg) => getScoringVisits(leg.visits))
  const checkoutLegs = legs.filter((leg) => legFinishedWithCheckout(leg.visits))

  const doubleCheckout = legs.reduce<DoubleCheckoutStats>((totals, leg) => {
    if (!isX01Config(leg.session.mode, leg.session.config)) {
      return totals
    }

    const sessionStats = countDoubleCheckoutStats(
      leg.visits,
      {
        doubleIn: leg.session.config.doubleIn,
        doubleOut: leg.session.config.doubleOut,
      },
      leg.session.config.doubleIn,
    )

    return mergeDoubleCheckoutStats(totals, sessionStats)
  }, emptyDoubleCheckoutStats())

  return {
    legCount: legs.length,
    checkoutLegCount: checkoutLegs.length,
    threeDartAverage: getThreeDartAverage(allVisits),
    threeDartAverageUntil170: getThreeDartAverage(scoringVisits),
    bestLegAverage: getMaxThreeDartAverage(legs.map((leg) => leg.visits)),
    avgDarts:
      checkoutLegs.length === 0
        ? null
        : checkoutLegs.reduce((sum, leg) => sum + countDartsInVisits(leg.visits), 0) /
          checkoutLegs.length,
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
