import type { Player } from '../../types/player'
import type { GameSession } from '../../types/gameSession'
import type { Visit } from '../../types/visit'
import { MAX_CHECKOUT_SCORE } from '../checkout/checkoutSuggestions'
import { getVisitsForLeg } from '../game/matchLegs'

export const getPrimaryPlayerVisits = (session: GameSession): Visit[] => {
  const playerId = session.players[0]?.id

  if (playerId === undefined) {
    return session.visits
  }

  return session.visits.filter((visit) => visit.playerId === playerId)
}

export const getPlayerVisits = (visits: Visit[], playerId: string): Visit[] =>
  visits.filter((visit) => visit.playerId === playerId)

export const getSessionFinalScore = (session: GameSession): number | null => {
  const lastVisit = getPrimaryPlayerVisits(session).at(-1)

  return lastVisit?.scoreAfter ?? null
}

export const countDartsInSession = (session: GameSession): number =>
  getPrimaryPlayerVisits(session).reduce((sum, visit) => sum + visit.darts.length, 0)

export const countTotalDartsThrown = (sessions: GameSession[]): number =>
  sessions.reduce((total, session) => total + countDartsInSession(session), 0)

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

export const getScoringVisits = (visits: Visit[]): Visit[] =>
  visits.filter((visit) => visit.scoreBefore > MAX_CHECKOUT_SCORE)

export const countCheckoutVisits = (visits: Visit[]): number =>
  visits.filter((visit) => visit.checkout).length

export const getSessionCheckoutRate = (session: GameSession): number | null => {
  const visits = getPrimaryPlayerVisits(session)

  if (visits.length === 0) {
    return null
  }

  return (countCheckoutVisits(visits) / visits.length) * 100
}

export const countThrown180 = (visits: Visit[]): number =>
  visits.filter((visit) => visit.visitScore === 180).length

export const countThrown140Plus = (visits: Visit[]): number =>
  visits.filter((visit) => visit.visitScore >= 140 && visit.visitScore < 180).length

export const countThrown100Plus = (visits: Visit[]): number =>
  visits.filter((visit) => visit.visitScore >= 100 && visit.visitScore < 140).length

export const getHighestCheckout = (visits: Visit[]): number | null => {
  const checkoutScores = visits.filter((visit) => visit.checkout).map((visit) => visit.scoreBefore)

  if (checkoutScores.length === 0) {
    return null
  }

  return Math.max(...checkoutScores)
}

export const getHighestVisit = (visits: Visit[]): number | null => {
  if (visits.length === 0) {
    return null
  }

  return Math.max(...visits.map((visit) => visit.visitScore))
}

export const countCheckouts100Plus = (visits: Visit[]): number =>
  visits.filter((visit) => visit.checkout && visit.scoreBefore >= 100).length

export const sessionFinishedWithCheckout = (session: GameSession): boolean =>
  getPrimaryPlayerVisits(session).some((visit) => visit.checkout)

export interface LegAndMatchAverages {
  leg: number | null
  match: number | null
}

export const getVisitAverages = (
  players: Player[],
  visits: Visit[],
): Record<string, number | null> =>
  Object.fromEntries(
    players.map((player) => [player.id, getThreeDartAverage(getPlayerVisits(visits, player.id))]),
  )

export const getLegAndMatchAverages = (
  players: Player[],
  visits: Visit[],
  currentLeg?: number,
): Record<string, LegAndMatchAverages> =>
  Object.fromEntries(
    players.map((player) => {
      const playerVisits = getPlayerVisits(visits, player.id)
      const matchAverage = getThreeDartAverage(playerVisits)
      const legVisits =
        currentLeg === undefined ? playerVisits : getVisitsForLeg(playerVisits, currentLeg)

      return [
        player.id,
        {
          leg: currentLeg === undefined ? matchAverage : getThreeDartAverage(legVisits),
          match: matchAverage,
        },
      ]
    }),
  )
