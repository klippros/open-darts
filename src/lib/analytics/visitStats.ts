import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'

export const getPrimaryPlayerVisits = (session: GameSession): Visit[] => {
  const playerId = session.players[0]?.id

  if (playerId === undefined) {
    return session.visits
  }

  return session.visits.filter((visit) => visit.playerId === playerId)
}

export const countDartsInSession = (session: GameSession): number =>
  getPrimaryPlayerVisits(session).reduce((sum, visit) => sum + visit.darts.length, 0)

export const getThreeDartAverage = (visits: Visit[]): number | null => {
  if (visits.length === 0) {
    return null
  }

  const total = visits.reduce((sum, visit) => sum + visit.visitScore, 0)

  return total / visits.length
}

export const getMaxGameThreeDartAverage = (sessions: GameSession[]): number | null => {
  const gameAverages = sessions
    .map((session) => getThreeDartAverage(getPrimaryPlayerVisits(session)))
    .filter((average): average is number => average !== null)

  if (gameAverages.length === 0) {
    return null
  }

  return Math.max(...gameAverages)
}

export const countCheckoutVisits = (visits: Visit[]): number =>
  visits.filter((visit) => visit.checkout).length

export const sessionFinishedWithCheckout = (session: GameSession): boolean =>
  getPrimaryPlayerVisits(session).some((visit) => visit.checkout)
