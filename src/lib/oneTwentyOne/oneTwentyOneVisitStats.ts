import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'
import { GameModeId } from '../../types/gameMode'
import {
  countCheckoutVisits,
  getPrimaryPlayerVisits,
  getThreeDartAverage,
} from '../analytics/visitStats'
import {
  getOneTwentyOneAttemptedTargetFromVisit,
  isOneTwentyOneRoundFailedVisit,
} from './oneTwentyOneVisitMetadata'

/** Successful checkout visits for the primary player in a session. */
export const getSessionCheckoutCount = (session: GameSession): number =>
  countCheckoutVisits(getPrimaryPlayerVisits(session))

/** Highest round target successfully checked out (e.g. 140 in a 121 climb). */
export const getHighestOneTwentyOneCheckoutTarget = (visits: Visit[]): number | null => {
  const targets = visits
    .filter((visit) => visit.checkout)
    .map((visit) => getOneTwentyOneAttemptedTargetFromVisit(visit))
    .filter((target): target is number => target !== undefined)

  if (targets.length === 0) {
    return null
  }

  return Math.max(...targets)
}

/**
 * Checkout rate by resolved target attempts: successful checkouts ÷
 * (checkouts + failed rounds). Mid-target visits are excluded.
 */
export const getOneTwentyOneCheckoutRate = (visits: Visit[]): number | null => {
  const successfulTargets = countCheckoutVisits(visits)
  const failedTargets = visits.filter((visit) => isOneTwentyOneRoundFailedVisit(visit)).length
  const resolvedTargets = successfulTargets + failedTargets

  if (resolvedTargets === 0) {
    return null
  }

  return (successfulTargets / resolvedTargets) * 100
}

export interface OneTwentyOneSingleSessionStats {
  checkouts: number
  visitCount: number
  threeDartAverage: number | null
  checkoutRate: number | null
  highestCheckout: number | null
}

export const computeOneTwentyOneSingleSessionStats = (
  session: GameSession,
): OneTwentyOneSingleSessionStats | null => {
  if (session.mode !== GameModeId.OneTwentyOne) {
    return null
  }

  const visits = getPrimaryPlayerVisits(session)

  return {
    checkouts: countCheckoutVisits(visits),
    visitCount: visits.length,
    threeDartAverage: getThreeDartAverage(visits),
    checkoutRate: getOneTwentyOneCheckoutRate(visits),
    highestCheckout: getHighestOneTwentyOneCheckoutTarget(visits),
  }
}
