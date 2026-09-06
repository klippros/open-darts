import type { GameSession } from '../../types/gameSession'
import { GameModeId } from '../../types/gameMode'
import { MAX_CHECKOUT_SCORE } from '../checkout/checkoutSuggestions'
import {
  countCheckoutVisits,
  getHighestCheckout,
  getPrimaryPlayerVisits,
  getSessionCheckoutRate,
} from '../analytics/visitStats'

export interface TenUpOneDownSingleSessionStats {
  checkouts: number
  visitCount: number
  checkoutRate: number | null
  highestCheckout: number | null
}

export const computeTenUpOneDownSingleSessionStats = (
  session: GameSession,
): TenUpOneDownSingleSessionStats | null => {
  if (session.mode !== GameModeId.TenUpOneDown) {
    return null
  }

  const visits = getPrimaryPlayerVisits(session)

  return {
    checkouts: countCheckoutVisits(visits),
    visitCount: visits.length,
    checkoutRate: getSessionCheckoutRate(session),
    highestCheckout: getHighestCheckout(visits),
  }
}

export const isTenUpOneDownWinSession = (session: GameSession): boolean => {
  if (session.mode !== GameModeId.TenUpOneDown || session.finishedEarly === true) {
    return false
  }

  const lastVisit = getPrimaryPlayerVisits(session).at(-1)

  return lastVisit?.checkout === true && lastVisit.scoreBefore === MAX_CHECKOUT_SCORE
}
