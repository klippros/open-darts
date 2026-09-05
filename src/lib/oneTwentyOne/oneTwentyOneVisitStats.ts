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
  getOneTwentyOnePeakTargetFromVisit,
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

export interface OneTwentyOneSingleSessionStats {
  checkouts: number
  visitCount: number
  threeDartAverage: number | null
  peakTarget: number | null
}

export const computeOneTwentyOneSingleSessionStats = (
  session: GameSession,
): OneTwentyOneSingleSessionStats | null => {
  if (session.mode !== GameModeId.OneTwentyOne) {
    return null
  }

  const visits = getPrimaryPlayerVisits(session)
  const lastVisit = visits.at(-1)
  const peakTarget = getOneTwentyOnePeakTargetFromVisit(lastVisit)

  return {
    checkouts: countCheckoutVisits(visits),
    visitCount: visits.length,
    threeDartAverage: getThreeDartAverage(visits),
    peakTarget: peakTarget ?? null,
  }
}
