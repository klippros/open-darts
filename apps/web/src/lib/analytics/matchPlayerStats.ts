import type { CheckoutRules } from '@open-darts/game/types/checkout'
import type { GameSession } from '@open-darts/game/types/gameSession'
import type { Visit } from '@open-darts/game/types/visit'
import { getCountingVisits } from '@open-darts/game/types/visit'
import { isX01Config } from '@open-darts/game/game/gameConfigGuards'
import { getVisitsForLeg } from '@open-darts/game/game/matchLegs'
import {
  countCheckouts100Plus,
  countThrown100Plus,
  countThrown140Plus,
  countThrown180,
  getHighestCheckout,
  getHighestVisit,
  getPlayerVisits,
  getScoringVisits,
  getThreeDartAverage,
  getVisitsBeforeDouble,
} from './visitStats'
import {
  countDoubleCheckoutStatsOmittingUnresolvedLegs,
  emptyDoubleCheckoutStats,
} from './doubleCheckoutStats'
import type { DoubleCheckoutStats } from './doubleCheckoutStats'

export interface PlayerMatchStats {
  threeDartAverage: number | null
  threeDartAverageUntil170: number | null
  threeDartAverageUntilDouble: number | null
  thrown180: number
  thrown140Plus: number
  thrown100Plus: number
  doubleCheckout: DoubleCheckoutStats
  doubleCheckoutUnavailable: boolean
  checkouts100Plus: number
  highestCheckout: number | null
  highestVisit: number | null
}

export const computePlayerStatsForVisits = (
  visits: Visit[],
  rules: CheckoutRules,
  doubleIn = false,
): PlayerMatchStats => {
  const doubleCheckoutResult = countDoubleCheckoutStatsOmittingUnresolvedLegs(
    visits,
    rules,
    doubleIn,
  )

  return {
    threeDartAverage: getThreeDartAverage(visits),
    threeDartAverageUntil170: getThreeDartAverage(getScoringVisits(visits)),
    threeDartAverageUntilDouble: rules.doubleOut
      ? getThreeDartAverage(getVisitsBeforeDouble(visits))
      : null,
    thrown180: countThrown180(visits),
    thrown140Plus: countThrown140Plus(visits),
    thrown100Plus: countThrown100Plus(visits),
    doubleCheckout: doubleCheckoutResult.stats,
    doubleCheckoutUnavailable: doubleCheckoutResult.unavailable,
    checkouts100Plus: countCheckouts100Plus(visits),
    highestCheckout: getHighestCheckout(visits),
    highestVisit: getHighestVisit(visits),
  }
}

export const computeMatchPlayerStats = (session: GameSession): Record<string, PlayerMatchStats> => {
  const { config } = session
  if (!isX01Config(session.mode, config)) {
    return {}
  }

  const rules = {
    doubleIn: config.doubleIn,
    doubleOut: config.doubleOut,
  }

  return Object.fromEntries(
    session.players.map((player) => [
      player.id,
      computePlayerStatsForVisits(
        getPlayerVisits(session.visits, player.id),
        rules,
        config.doubleIn,
      ),
    ]),
  )
}

export const computeLegPlayerStats = (
  session: GameSession,
  legNumber: number,
): Record<string, PlayerMatchStats> => {
  const { config } = session
  if (!isX01Config(session.mode, config)) {
    return {}
  }

  const legVisits = getCountingVisits(getVisitsForLeg(session.visits, legNumber))
  const rules = {
    doubleIn: config.doubleIn,
    doubleOut: config.doubleOut,
  }

  return Object.fromEntries(
    session.players.map((player) => [
      player.id,
      computePlayerStatsForVisits(
        legVisits.filter((visit) => visit.playerId === player.id),
        rules,
        config.doubleIn,
      ),
    ]),
  )
}

export const emptyPlayerMatchStats = (): PlayerMatchStats => ({
  threeDartAverage: null,
  threeDartAverageUntil170: null,
  threeDartAverageUntilDouble: null,
  thrown180: 0,
  thrown140Plus: 0,
  thrown100Plus: 0,
  doubleCheckout: emptyDoubleCheckoutStats(),
  doubleCheckoutUnavailable: false,
  checkouts100Plus: 0,
  highestCheckout: null,
  highestVisit: null,
})
