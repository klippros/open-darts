import type { CheckoutRules } from '../../types/checkout'
import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'
import { isX01Config } from '../game/gameConfigGuards'
import { getVisitsForLeg } from '../game/matchLegs'
import {
  countCheckouts100Plus,
  countThrown100Plus,
  countThrown140Plus,
  countThrown180,
  getHighestCheckout,
  getHighestVisit,
  getScoringVisits,
  getThreeDartAverage,
} from './visitStats'
import {
  countDoubleCheckoutStats,
  type DoubleCheckoutStats,
  emptyDoubleCheckoutStats,
} from './doubleCheckoutStats'

export interface PlayerMatchStats {
  threeDartAverage: number | null
  threeDartAverageUntil170: number | null
  thrown180: number
  thrown140Plus: number
  thrown100Plus: number
  doubleCheckout: DoubleCheckoutStats
  checkouts100Plus: number
  highestCheckout: number | null
  highestVisit: number | null
}

export const computePlayerStatsForVisits = (
  visits: Visit[],
  rules: CheckoutRules,
  doubleIn = false,
): PlayerMatchStats => ({
  threeDartAverage: getThreeDartAverage(visits),
  threeDartAverageUntil170: getThreeDartAverage(getScoringVisits(visits)),
  thrown180: countThrown180(visits),
  thrown140Plus: countThrown140Plus(visits),
  thrown100Plus: countThrown100Plus(visits),
  doubleCheckout: countDoubleCheckoutStats(visits, rules, doubleIn),
  checkouts100Plus: countCheckouts100Plus(visits),
  highestCheckout: getHighestCheckout(visits),
  highestVisit: getHighestVisit(visits),
})

export const computeMatchPlayerStats = (session: GameSession): Record<string, PlayerMatchStats> => {
  if (!isX01Config(session.mode, session.config)) {
    return {}
  }

  const rules = {
    doubleIn: session.config.doubleIn,
    doubleOut: session.config.doubleOut,
  }

  return Object.fromEntries(
    session.players.map((player) => [
      player.id,
      computePlayerStatsForVisits(
        session.visits.filter((visit) => visit.playerId === player.id),
        rules,
        session.config.doubleIn,
      ),
    ]),
  )
}

export const computeLegPlayerStats = (
  session: GameSession,
  legNumber: number,
): Record<string, PlayerMatchStats> => {
  if (!isX01Config(session.mode, session.config)) {
    return {}
  }

  const legVisits = getVisitsForLeg(session.visits, legNumber)
  const rules = {
    doubleIn: session.config.doubleIn,
    doubleOut: session.config.doubleOut,
  }

  return Object.fromEntries(
    session.players.map((player) => [
      player.id,
      computePlayerStatsForVisits(
        legVisits.filter((visit) => visit.playerId === player.id),
        rules,
        session.config.doubleIn,
      ),
    ]),
  )
}

export const emptyPlayerMatchStats = (): PlayerMatchStats => ({
  threeDartAverage: null,
  threeDartAverageUntil170: null,
  thrown180: 0,
  thrown140Plus: 0,
  thrown100Plus: 0,
  doubleCheckout: emptyDoubleCheckoutStats(),
  checkouts100Plus: 0,
  highestCheckout: null,
  highestVisit: null,
})
